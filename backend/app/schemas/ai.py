from typing import List, Optional

from pydantic import BaseModel


class AiSummaryRequest(BaseModel):
    service: Optional[str] = None
    release: Optional[str] = None


class AiSummaryResponse(BaseModel):
    summary: str
    model: str
    context_used: dict


class AiIncidentAnalyzeRequest(BaseModel):
    incident_id: str


class AiIncidentAnalyzeResponse(BaseModel):
    potential_causes: List[str]
    recommended_investigation: List[str]
    model: str


class AiChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class AiChatRequest(BaseModel):
    question: str
    history: List[AiChatMessage] = []


class AiChatResponse(BaseModel):
    answer: str
    model: str
    context_used: dict
