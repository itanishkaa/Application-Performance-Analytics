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
    AiServiceAnalyzeRequest,
    AiServiceAnalyzeResponse,
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


@router.post("/analyze-service", response_model=AiServiceAnalyzeResponse)
def ai_analyze_service(
    payload: AiServiceAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Service Details page's "Analyze with AI" button — flags potential
    issues for a service from its current metrics, without needing a
    formal Incident record to already exist."""
    df = load_logs_df(db)
    service_df = analytics_service.apply_filters(df, service=payload.service)
    if len(service_df) == 0:
        raise HTTPException(status_code=404, detail="Service not found")

    kpis = analytics_service.calculate_kpis(service_df)
    releases = analytics_service.analyze_release_performance(service_df)
    context = {
        "service": payload.service,
        "current_metrics": kpis,
        "release_performance": releases.to_dict(orient="records"),
        "regression_check": analytics_service.detect_regressions(
            releases, sorted(releases["release_version"].tolist())
        ).to_dict(orient="records"),
    }

    try:
        result = ai_client.generate_service_analysis(context)
    except ai_client.AiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {**result, "model": settings.OLLAMA_MODEL}


@router.post("/chat", response_model=AiChatResponse)
def ai_chat(
    payload: AiChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Grounded in enough breakdowns to answer the suggested questions on the
    # AI page (slowest endpoint, highest error-rate service, worst region,
    # etc.) — not just the overall KPI snapshot.
    df = load_logs_df(db)
    per_service = {
        name: analytics_service.calculate_kpis(group) for name, group in df.groupby("service_name")
    }
    context = {
        "overview": analytics_service.calculate_kpis(df),
        "services": [
            {"service_name": name, **metrics} for name, metrics in per_service.items()
        ],
        "slowest_endpoints": (
            analytics_service.analyze_endpoint_performance(df)
            .sort_values("p95_latency_ms", ascending=False)
            .head(10)
            .to_dict(orient="records")
        ),
        "releases": analytics_service.analyze_release_performance(df).to_dict(orient="records"),
        "regions": analytics_service.analyze_region_performance(df).to_dict(orient="records"),
    }

    try:
        answer = ai_client.answer_question(
            payload.question, context, [m.model_dump() for m in payload.history]
        )
    except ai_client.AiUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"answer": answer, "model": settings.OLLAMA_MODEL, "context_used": context}
