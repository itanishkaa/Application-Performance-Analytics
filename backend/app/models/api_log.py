from datetime import datetime

from sqlalchemy import String, DateTime, Integer, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ApiLog(Base):
    """A single cleaned API log record. Mirrors the `api_logs_clean` table
    from the original SQL pipeline (see legacy/Cleaned_Data_using_SQL.sql).
    """

    __tablename__ = "api_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    release_version: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    server_region: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    dataset_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("datasets.id"), nullable=False, index=True
    )

    __table_args__ = (
        Index("ix_api_logs_service_endpoint", "service_name", "endpoint"),
        Index("ix_api_logs_release_region", "release_version", "server_region"),
    )
