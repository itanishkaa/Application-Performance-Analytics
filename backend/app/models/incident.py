import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, DateTime, Text, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # low | medium | high | critical
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    # open | acknowledged | resolved
    status: Mapped[str] = mapped_column(String(20), default="open")
    service: Mapped[str] = mapped_column(String(100), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # high_error_rate | high_latency | sudden_latency_increase | release_regression
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    __table_args__ = (
        # Enforced in application logic too (SQLite partial-unique-index
        # support varies by version), but declared here as the intended
        # invariant: only one OPEN incident per (service, trigger_type).
        Index(
            "ux_incidents_open_service_trigger",
            "service", "trigger_type", "status",
            unique=False,
        ),
    )
