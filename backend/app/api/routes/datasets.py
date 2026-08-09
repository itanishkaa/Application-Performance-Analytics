from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.api_log import ApiLog
from app.models.dataset import Dataset
from app.models.user import User
from app.services.cleaning import clean_dataframe
from app.services.ingestion import IngestionError, read_raw_csv

router = APIRouter(prefix="/datasets", tags=["datasets"])


def _persist(db: Session, dataset: Dataset, clean_df) -> None:
    dataset.row_count = len(clean_df)
    dataset.status = "cleaned"
    db.add(dataset)
    db.flush()  # get dataset.id assigned before we reference it below

    records = clean_df.to_dict(orient="records")
    db.bulk_insert_mappings(
        ApiLog,
        [
            {
                "timestamp": r["timestamp"],
                "service_name": r["service_name"],
                "endpoint": r["endpoint"],
                "status_code": int(r["status_code"]),
                "response_time_ms": int(r["response_time_ms"]),
                "release_version": r["release_version"],
                "server_region": r["server_region"],
                "dataset_id": dataset.id,
            }
            for r in records
        ],
    )
    db.commit()


@router.get("")
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.scalars(select(Dataset).order_by(Dataset.created_at.desc())).all()
    return {
        "datasets": [
            {
                "id": d.id,
                "name": d.name,
                "file_name": d.file_name,
                "row_count": d.row_count,
                "status": d.status,
                "created_at": d.created_at.isoformat(),
            }
            for d in rows
        ]
    }


@router.post("/upload")
def upload_dataset(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingest a user-uploaded CSV: validate -> clean -> store (PRD section 52)."""
    dataset = Dataset(name=file.filename or "uploaded-dataset", file_name=file.filename or "upload.csv")

    try:
        raw_df = read_raw_csv(file.file)
    except IngestionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    clean_df, report = clean_dataframe(raw_df)
    _persist(db, dataset, clean_df)

    return {
        "dataset_id": dataset.id,
        "raw_rows": report.raw_rows,
        "clean_rows": report.clean_rows,
        "dropped_invalid_status": report.dropped_invalid_status,
        "dropped_invalid_latency": report.dropped_invalid_latency,
        "duplicates_removed": report.duplicates_removed,
    }


@router.post("/load-sample")
def load_sample_dataset(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convenience endpoint for local dev: ingest the bundled sample CSV
    at data/raw/api_logs_uncleaned.csv (settings.DEFAULT_RAW_CSV_PATH)
    without needing to upload it through the UI."""
    backend_dir = Path(__file__).resolve().parents[3]
    csv_path = (backend_dir / settings.DEFAULT_RAW_CSV_PATH).resolve()
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail=f"Sample CSV not found at {csv_path}")

    dataset = Dataset(name="Sample synthetic dataset", file_name=csv_path.name)
    raw_df = read_raw_csv(str(csv_path))
    clean_df, report = clean_dataframe(raw_df)
    _persist(db, dataset, clean_df)

    return {
        "dataset_id": dataset.id,
        "raw_rows": report.raw_rows,
        "clean_rows": report.clean_rows,
        "dropped_invalid_status": report.dropped_invalid_status,
        "dropped_invalid_latency": report.dropped_invalid_latency,
        "duplicates_removed": report.duplicates_removed,
    }
