from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import analytics as analytics_service
from app.services.data_access import load_logs_df

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("")
def list_regions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    if len(df) == 0:
        return {"regions": []}
    return {"regions": sorted(df["server_region"].unique().tolist())}


@router.get("/performance")
def region_performance(
    service: Optional[str] = None,
    release: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    df = load_logs_df(db)
    df = analytics_service.apply_filters(df, service=service, release=release)
    result = analytics_service.analyze_region_performance(df)
    return {"regions": result.to_dict(orient="records")}
