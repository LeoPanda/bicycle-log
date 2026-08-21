from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.core.database import get_session
from app.services.strava_service import sync_strava_activities

router = APIRouter(prefix="/api/strava", tags=["strava"])

@router.post("/sync")
def trigger_strava_sync(
    limit_months: Optional[int] = Query(None, description="Optional past months to sync"),
    session: Session = Depends(get_session)
):
    result = sync_strava_activities(session, limit_months=limit_months)
    return result
