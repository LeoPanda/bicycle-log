from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from sqlmodel import Session, select, func
from fastapi import HTTPException, status
from app.models.activity import Activity
from app.models.bike import Bike
from app.models.stay_log import StayLog, StayLogImage
from app.models.place import Place
from app.models.category import PlaceCategory
from app.models.tag import ActivityTag
from app.schemas.activity import ActivityCreate, ActivityUpdate

def list_activities_data(
    session: Session,
    q: Optional[str] = None,
    bike_id: Optional[int] = None,
    sort_by: str = "start_date",
    sort_order: str = "desc",
    page: int = 1,
    per_page: int = 20
) -> Dict[str, Any]:
    if sort_by == "stay_count":
        statement = select(Activity, func.count(StayLog.id).label("stay_cnt")).outerjoin(StayLog, Activity.id == StayLog.activity_id)
        if bike_id is not None:
            statement = statement.where(Activity.bike_id == bike_id)
        if q:
            search_pattern = f"%{q}%"
            statement = statement.where(Activity.name.like(search_pattern))
        statement = statement.group_by(Activity.id)
        
        total = len(session.exec(statement).all())
        
        if sort_order == "asc":
            statement = statement.order_by(func.count(StayLog.id).asc(), Activity.start_date.desc())
        else:
            statement = statement.order_by(func.count(StayLog.id).desc(), Activity.start_date.desc())
            
        offset = (page - 1) * per_page
        rows = session.exec(statement.offset(offset).limit(per_page)).all()
        activities = [row[0] for row in rows]
    else:
        statement = select(Activity)
        if bike_id is not None:
            statement = statement.where(Activity.bike_id == bike_id)
        if q:
            search_pattern = f"%{q}%"
            statement = statement.where(Activity.name.like(search_pattern))
            
        total = len(session.exec(statement).all())
        
        col = getattr(Activity, sort_by, Activity.start_date)
        if sort_order == "asc":
            order_clause = col.asc()
        else:
            order_clause = col.desc()
            
        offset = (page - 1) * per_page
        activities = session.exec(statement.order_by(order_clause).offset(offset).limit(per_page)).all()

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

def get_activity_detail(session: Session, activity_id: int) -> Dict[str, Any]:
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    
    bike = session.get(Bike, activity.bike_id) if activity.bike_id else None
    stay_logs = session.exec(select(StayLog).where(StayLog.activity_id == activity_id)).all()
    
    detailed_stays = []
    for s in stay_logs:
        place = session.get(Place, s.place_id)
        cat = session.get(PlaceCategory, place.category_id) if (place and place.category_id) else None
        images = session.exec(
            select(StayLogImage).where(StayLogImage.stay_log_id == s.id).order_by(StayLogImage.display_order.asc())
        ).all()
        s_dict = s.model_dump()
        s_dict["place_name"] = place.name if place else "不明なスポット"
        s_dict["place_address"] = place.address if place else ""
        s_dict["category_name"] = cat.name if cat else "未分類"
        s_dict["category_icon"] = cat.icon if cat else "map-pin"
        s_dict["latitude"] = place.latitude if place else None
        s_dict["longitude"] = place.longitude if place else None
        s_dict["images"] = images
        detailed_stays.append(s_dict)
        
    act_dict = activity.model_dump()
    act_dict["bike_name"] = bike.name if bike else "未設定"
    act_dict["stay_logs"] = detailed_stays
    act_dict["strava_url"] = f"https://www.strava.com/activities/{activity.id}"
    return act_dict

def create_activity(session: Session, act_in: ActivityCreate) -> Activity:
    existing = session.get(Activity, act_in.id)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activity ID already exists")
    
    activity = Activity.model_validate(act_in)
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity

def update_activity(session: Session, activity_id: int, act_in: ActivityUpdate) -> Activity:
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    
    act_data = act_in.model_dump(exclude_unset=True)
    for key, value in act_data.items():
        setattr(activity, key, value)
    activity.updated_at = datetime.now()
    
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity

def delete_activity(session: Session, activity_id: int) -> None:
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    
    stay_logs = session.exec(select(StayLog).where(StayLog.activity_id == activity_id)).all()
    stay_log_ids = [s.id for s in stay_logs if s.id is not None]
    
    if stay_log_ids:
        images = session.exec(select(StayLogImage).where(StayLogImage.stay_log_id.in_(stay_log_ids))).all()
        for img in images:
            session.delete(img)
            
    for s in stay_logs:
        session.delete(s)
        
    activity_tags = session.exec(select(ActivityTag).where(ActivityTag.activity_id == activity_id)).all()
    for tag in activity_tags:
        session.delete(tag)
        
    session.delete(activity)
    session.commit()
