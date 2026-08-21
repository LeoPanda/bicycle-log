from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, or_
from app.core.database import get_session
from app.models.activity import Activity, ActivityCreate, ActivityUpdate
from app.models.bike import Bike
from app.models.stay_log import StayLog, StayLogImage
from app.models.place import Place

router = APIRouter(prefix="/api/activities", tags=["activities"])

@router.get("")
def list_activities(
    q: Optional[str] = Query(None, description="Fuzzy search keyword"),
    bike_id: Optional[int] = Query(None, description="Bike filter"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
):
    statement = select(Activity)
    
    if bike_id is not None:
        statement = statement.where(Activity.bike_id == bike_id)
        
    if q:
        search_pattern = f"%{q}%"
        statement = statement.where(Activity.name.like(search_pattern))
        
    total = len(session.exec(statement).all())
    
    offset = (page - 1) * per_page
    activities = session.exec(statement.order_by(Activity.start_date.desc()).offset(offset).limit(per_page)).all()
    
    results = []
    for act in activities:
        bike = session.get(Bike, act.bike_id) if act.bike_id else None
        stay_logs = session.exec(select(StayLog).where(StayLog.activity_id == act.id)).all()
        act_dict = act.model_dump()
        act_dict["bike_name"] = bike.name if bike else "未設定"
        act_dict["stay_count"] = len(stay_logs)
        results.append(act_dict)
        
    return {
        "items": results,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if total > 0 else 1
    }

@router.post("", response_model=Activity, status_code=status.HTTP_201_CREATED)
def create_activity(act_in: ActivityCreate, session: Session = Depends(get_session)):
    existing = session.get(Activity, act_in.id)
    if existing:
        raise HTTPException(status_code=400, detail="Activity ID already exists")
    
    activity = Activity.model_validate(act_in)
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity

@router.get("/{activity_id}")
def get_activity(activity_id: int, session: Session = Depends(get_session)):
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    bike = session.get(Bike, activity.bike_id) if activity.bike_id else None
    stay_logs = session.exec(select(StayLog).where(StayLog.activity_id == activity_id)).all()
    
    detailed_stays = []
    for s in stay_logs:
        place = session.get(Place, s.place_id)
        images = session.exec(select(StayLogImage).where(StayLogImage.stay_log_id == s.id).order_by(StayLogImage.display_order.asc())).all()
        s_dict = s.model_dump()
        s_dict["place_name"] = place.name if place else "不明なスポット"
        s_dict["place_address"] = place.address if place else ""
        s_dict["images"] = images
        detailed_stays.append(s_dict)
        
    act_dict = activity.model_dump()
    act_dict["bike_name"] = bike.name if bike else "未設定"
    act_dict["stay_logs"] = detailed_stays
    return act_dict

@router.put("/{activity_id}", response_model=Activity)
def update_activity(activity_id: int, act_in: ActivityUpdate, session: Session = Depends(get_session)):
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    act_data = act_in.model_dump(exclude_unset=True)
    for key, value in act_data.items():
        setattr(activity, key, value)
    activity.updated_at = datetime.now()
    
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity

@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: int, session: Session = Depends(get_session)):
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Delete associated stay logs
    stay_logs = session.exec(select(StayLog).where(StayLog.activity_id == activity_id)).all()
    for s in stay_logs:
        session.delete(s)
        
    session.delete(activity)
    session.commit()
    return None
