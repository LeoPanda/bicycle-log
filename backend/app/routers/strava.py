from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.core.database import get_session
from app.services.strava_service import sync_strava_activities, backfill_activity_endpoints

router = APIRouter(prefix="/api/strava", tags=["strava"])

@router.post("/sync")
def trigger_strava_sync(
    limit_months: Optional[int] = Query(None, description="Optional past months to sync"),
    all_time: bool = Query(False, description="Sync all time activities regardless of latest activity"),
    before_timestamp: Optional[int] = Query(None, description="Optional before timestamp filter to sync past activities"),
    session: Session = Depends(get_session)
):
    result = sync_strava_activities(
        session,
        limit_months=limit_months,
        all_time=all_time,
        before_timestamp=before_timestamp
    )
    return result

@router.post("/backfill-endpoints")
def trigger_backfill_endpoints(
    all_activities: bool = Query(True, description="Backfill start and end points for all activities"),
    limit_months: Optional[int] = Query(None, description="Optional past months to limit backfill"),
    session: Session = Depends(get_session)
):
    result = backfill_activity_endpoints(
        session,
        all_activities=all_activities,
        limit_months=limit_months
    )
    return result
