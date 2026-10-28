from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.database import get_session
from app.schemas.analytics import DashboardResponse, HeatmapResponse, MetricsResponse
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_summary(session: Session = Depends(get_session)):
    return analytics_service.get_dashboard_summary_data(session=session)

@router.get("/metrics", response_model=MetricsResponse)
def get_activity_metrics(
    range_type: str = Query("monthly", description="Time range: annual, monthly, weekly"),
    bike_id: Optional[int] = Query(None, description="Filter by bike ID"),
    session: Session = Depends(get_session)
):
    return analytics_service.get_activity_metrics_data(
        session=session,
        range_type=range_type,
        bike_id=bike_id
    )

@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap_data(
    year: Optional[str] = Query(None, description="Filter by year e.g. 2026 or all"),
    session: Session = Depends(get_session)
):
    return analytics_service.get_heatmap_data_service(
        session=session,
        year=year
    )
