"""
AI Analyst client.

Talks to a locally-hosted Ollama server (PRD section 28). Deliberately the
*only* place in the codebase that constructs LLM prompts, so context rules
(PRD section 33 — compact structured JSON in, never raw logs) are enforced
in one spot.

The LLM never computes metrics itself: callers must pass in metrics already
produced by app.services.analytics, and this module only turns them into a
prompt and asks the model to explain/summarize.
"""
from __future__ import annotations

import json
from typing import Optional

import httpx

from app.core.config import settings

SYSTEM_PROMPT = (
    "You are PulseOps AI Analyst, an assistant that helps engineers understand "
    "application performance and reliability data. You are given pre-computed "
    "metrics as JSON — never raw logs. Do not invent numbers that are not in "
    "the provided context. When asked for root cause, list POTENTIAL "
    "contributing factors and a recommended investigation checklist — do not "
    "claim a definitive root cause."
)


class AiUnavailableError(RuntimeError):
    """Raised when Ollama can't be reached. Callers should catch this and
    degrade gracefully (PRD section 48 — AI must never be a dependency for
    core analytics)."""


def _call_ollama(prompt: str) -> str:
    url = f"{settings.OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
        "stream": False,
    }
    try:
        response = httpx.post(url, json=payload, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise AiUnavailableError(f"Could not reach Ollama at {settings.OLLAMA_BASE_URL}: {exc}") from exc

    data = response.json()
    return data.get("response", "").strip()


def generate_summary(context: dict) -> str:
    """PRD section 30 — AI Executive Summary."""
    prompt = (
        "Write a concise (3-4 sentence) executive summary of this service's "
        "performance based on the metrics below. Reference specific numbers.\n\n"
        f"Metrics JSON:\n{json.dumps(context, indent=2)}"
    )
    return _call_ollama(prompt)


def generate_incident_analysis(context: dict) -> dict:
    """PRD section 31 — Root-cause investigation assistant.

    Returns {"potential_causes": [...], "recommended_investigation": [...]}
    parsed from a structured-JSON model response.
    """
    prompt = (
        "Given this incident's metrics, respond ONLY with JSON in the form "
        '{"potential_causes": [".."], "recommended_investigation": [".."]}. '
        "List 2-5 potential causes and 2-5 concrete investigation steps. "
        "Do not include any text outside the JSON object.\n\n"
        f"Incident metrics JSON:\n{json.dumps(context, indent=2)}"
    )
    raw = _call_ollama(prompt)
    try:
        cleaned = raw.strip().strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        parsed = json.loads(cleaned)
        return {
            "potential_causes": parsed.get("potential_causes", []),
            "recommended_investigation": parsed.get("recommended_investigation", []),
        }
    except (json.JSONDecodeError, AttributeError):
        # Model didn't return clean JSON — fall back to showing raw text
        # as a single "cause" rather than failing the request outright.
        return {"potential_causes": [raw], "recommended_investigation": []}


def answer_question(question: str, context: dict, history: Optional[list] = None) -> str:
    """PRD section 32 — AI Q&A. `context` must already contain only the
    metrics relevant to the question (PRD section 33), retrieved by the
    caller before this function is invoked."""
    history_text = ""
    if history:
        history_text = "\n".join(f"{m['role']}: {m['content']}" for m in history) + "\n"

    prompt = (
        f"{history_text}"
        f"Relevant metrics JSON:\n{json.dumps(context, indent=2)}\n\n"
        f"Question: {question}\n"
        "Answer using only the metrics above. If the metrics don't contain "
        "enough information to answer, say so explicitly."
    )
    return _call_ollama(prompt)
