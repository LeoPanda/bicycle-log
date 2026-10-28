from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session
from app.core.database import get_session
from app.schemas.activity import (
    ActivityCreate, ActivityUpdate, ActivityResponse, ActivityListResponse
)
from app.services import activity_service

router = APIRouter(prefix="/api/activities", tags=["activities"])

@router.get("", response_model=ActivityListResponse)
def list_activities(
    q: Optional[str] = Query(None, description="Fuzzy search keyword"),
    bike_id: Optional[int] = Query(None, description="Bike filter"),
    sort_by: str = Query("start_date", description="Sort column: start_date, distance, total_elevation_gain, stay_count"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
):
    return activity_service.list_activities_data(
        session=session,
        q=q,
        bike_id=bike_id,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page
    )

@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(act_in: ActivityCreate, session: Session = Depends(get_session)):
    return activity_service.create_activity(session=session, act_in=act_in)

@router.get("/{activity_id}")
def get_activity(activity_id: int, session: Session = Depends(get_session)):
    return activity_service.get_activity_detail(session=session, activity_id=activity_id)

@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(activity_id: int, act_in: ActivityUpdate, session: Session = Depends(get_session)):
    return activity_service.update_activity(session=session, activity_id=activity_id, act_in=act_in)

@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: int, session: Session = Depends(get_session)):
    activity_service.delete_activity(session=session, activity_id=activity_id)
    return None
