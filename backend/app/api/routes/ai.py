from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.incident import Incident
from app.models.user import User
from app.schemas.ai import (
    AiChatRequest,
    AiChatResponse,
    AiIncidentAnalyzeRequest,
    AiIncidentAnalyzeResponse,
    AiSummaryRequest,
    AiSummaryResponse,
)
from app.services import ai_client
from app.services import analytics as analytics_service
from app.services.data_access import load_logs_df

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/summary", response_model=AiSummaryResponse)
def ai_summary(
    payload: AiSummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    df = analytics_service.apply_filters(df, service=payload.service, release=payload.release)
    context = analytics_service.calculate_kpis(df)
    context["service"] = payload.service or "all services"
    context["release"] = payload.release or "all releases"

    try:
        summary = ai_client.generate_summary(context)
    except ai_client.AiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"summary": summary, "model": settings.OLLAMA_MODEL, "context_used": context}


@router.post("/analyze-incident", response_model=AiIncidentAnalyzeResponse)
def ai_analyze_incident(
    payload: AiIncidentAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.get(Incident, payload.incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    df = load_logs_df(db)
    service_df = analytics_service.apply_filters(df, service=incident.service)
    context = {
        "incident_title": incident.title,
        "trigger_type": incident.trigger_type,
        "severity": incident.severity,
        "service": incident.service,
        "description": incident.description,
        "current_metrics": analytics_service.calculate_kpis(service_df),
    }

    try:
        result = ai_client.generate_incident_analysis(context)
    except ai_client.AiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {**result, "model": settings.OLLAMA_MODEL}


@router.post("/chat", response_model=AiChatResponse)
def ai_chat(
    payload: AiChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # V1: always ground the chat in the overall KPI snapshot plus top
    # services/releases. A future version could route the question to a
    # narrower context (e.g. detect "which endpoint" -> endpoint table).
    df = load_logs_df(db)
    context = {
        "overview": analytics_service.calculate_kpis(df),
        "top_releases": analytics_service.analyze_release_performance(df).to_dict(orient="records"),
        "regions": analytics_service.analyze_region_performance(df).to_dict(orient="records"),
    }

    try:
        answer = ai_client.answer_question(
            payload.question, context, [m.model_dump() for m in payload.history]
        )
    except ai_client.AiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"answer": answer, "model": settings.OLLAMA_MODEL, "context_used": context}
