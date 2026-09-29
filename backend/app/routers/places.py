from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, or_, func
from app.core.database import get_session
from app.models.place import Place, PlaceCreate, PlaceUpdate
from app.models.category import PlaceCategory
from app.models.stay_log import StayLog, StayLogImage
from app.models.activity import Activity

router = APIRouter(prefix="/api/places", tags=["places"])

@router.get("")
def list_places(
    q: Optional[str] = Query(None, description="Fuzzy search keyword"),
    category_id: Optional[int] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
):
    statement = (
        select(Place, func.count(StayLog.id).label("visit_count"))
        .outerjoin(StayLog, Place.id == StayLog.place_id)
    )
    
    if category_id is not None:
        statement = statement.where(Place.category_id == category_id)
        
    if q:
        search_pattern = f"%{q}%"
        statement = statement.where(
            or_(
                Place.name.like(search_pattern),
                Place.address.like(search_pattern)
            )
        )
        
    statement = statement.group_by(Place.id)
    
    # Count total
    total = len(session.exec(statement).all())
    
    # Paginate ordered by visit count descending
    offset = (page - 1) * per_page
    rows = session.exec(
        statement.order_by(func.count(StayLog.id).desc(), Place.name.asc())
        .offset(offset)
        .limit(per_page)
    ).all()
    
    results = []
    for p, stay_count in rows:
        cat = session.get(PlaceCategory, p.category_id) if p.category_id else None
        p_dict = p.model_dump()
        p_dict["category_name"] = cat.name if cat else "未分類"
        p_dict["category_icon"] = cat.icon if cat else "map-pin"
        p_dict["visit_count"] = stay_count
        results.append(p_dict)
        
    return {
        "items": results,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if total > 0 else 1
    }

@router.get("/search-nearby")
def search_nearby(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(2000.0, description="Radius in meters"),
    q: Optional[str] = Query(None, description="Search keyword"),
    session: Session = Depends(get_session)
):
    from app.services.places_service import search_nearby_places
    return search_nearby_places(session=session, lat=lat, lng=lng, radius=radius, query=q)

@router.post("", response_model=Place, status_code=status.HTTP_201_CREATED)
def create_place(place_in: PlaceCreate, session: Session = Depends(get_session)):
    existing = session.get(Place, place_in.id)
    if existing:
        raise HTTPException(status_code=400, detail="Place ID already exists")
    
    place = Place.model_validate(place_in)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place

def _enrich_stay_logs(session: Session, stay_logs: List[StayLog]) -> List[Dict[str, Any]]:
    detailed_stays = []
    for s in stay_logs:
        activity = session.get(Activity, s.activity_id) if s.activity_id else None
        images = session.exec(select(StayLogImage).where(StayLogImage.stay_log_id == s.id).order_by(StayLogImage.display_order.asc())).all()
        s_dict = s.model_dump()
        s_dict["activity_name"] = activity.name if activity else f"アクティビティ #{s.activity_id}"
        s_dict["activity_start_date"] = activity.start_date.isoformat() if (activity and activity.start_date) else None
        s_dict["images"] = images
        detailed_stays.append(s_dict)
    return detailed_stays

@router.get("/{place_id}")
def get_place(place_id: str, session: Session = Depends(get_session)):
    place = session.get(Place, place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    cat = session.get(PlaceCategory, place.category_id) if place.category_id else None
    stay_logs = session.exec(select(StayLog).where(StayLog.place_id == place_id).order_by(StayLog.arrived_at.desc())).all()
    
    p_dict = place.model_dump()
    p_dict["category_name"] = cat.name if cat else "未分類"
    p_dict["category_icon"] = cat.icon if cat else "map-pin"
    p_dict["visit_count"] = len(stay_logs)
    p_dict["stay_logs"] = _enrich_stay_logs(session, stay_logs)
    return p_dict

from pydantic import BaseModel

class OverwritePlaceSchema(BaseModel):
    new_place_id: str
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    category_name: Optional[str] = None

@router.put("/{place_id}/overwrite")
def overwrite_place(
    place_id: str,
    place_in: OverwritePlaceSchema,
    session: Session = Depends(get_session)
):
    current_place = session.get(Place, place_id)
    if not current_place:
        raise HTTPException(status_code=404, detail="Current place not found")

    cat_name = place_in.category_name or "未分類"
    category = session.exec(select(PlaceCategory).where(PlaceCategory.name == cat_name)).first()
    if not category:
        category = session.exec(select(PlaceCategory).where(PlaceCategory.name == "未分類")).first()

    target_place_id = place_in.new_place_id
    if target_place_id == place_id:
        current_place.name = place_in.name
        current_place.address = place_in.address
        current_place.latitude = place_in.latitude
        current_place.longitude = place_in.longitude
        if category:
            current_place.category_id = category.id
        current_place.updated_at = datetime.now()
        session.add(current_place)
        session.commit()
        session.refresh(current_place)
        target_place = current_place
    else:
        target_place = session.get(Place, target_place_id)
        if not target_place:
            target_place = Place(
                id=target_place_id,
                name=place_in.name,
                address=place_in.address,
                latitude=place_in.latitude,
                longitude=place_in.longitude,
                category_id=category.id if category else None
            )
            session.add(target_place)
        else:
            target_place.name = place_in.name
            target_place.address = place_in.address
            target_place.latitude = place_in.latitude
            target_place.longitude = place_in.longitude
            if category:
                target_place.category_id = category.id
            target_place.updated_at = datetime.now()
            session.add(target_place)
        
        session.commit()
        session.refresh(target_place)

        stay_logs = session.exec(select(StayLog).where(StayLog.place_id == place_id)).all()
        for stay in stay_logs:
            stay.place_id = target_place_id
            stay.updated_at = datetime.now()
            session.add(stay)
        session.commit()
        
        current_place.stay_logs = []
        session.delete(current_place)
        session.commit()

    cat = session.get(PlaceCategory, target_place.category_id) if target_place.category_id else None
    stay_logs = session.exec(select(StayLog).where(StayLog.place_id == target_place.id).order_by(StayLog.arrived_at.desc())).all()
    p_dict = target_place.model_dump()
    p_dict["category_name"] = cat.name if cat else "未分類"
    p_dict["category_icon"] = cat.icon if cat else "map-pin"
    p_dict["visit_count"] = len(stay_logs)
    p_dict["stay_logs"] = _enrich_stay_logs(session, stay_logs)
    return p_dict

@router.put("/{place_id}", response_model=Place)
def update_place(place_id: str, place_in: PlaceUpdate, session: Session = Depends(get_session)):
    place = session.get(Place, place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    place_data = place_in.model_dump(exclude_unset=True)
    for key, value in place_data.items():
        setattr(place, key, value)
    place.updated_at = datetime.now()
    
    session.add(place)
    session.commit()
    session.refresh(place)
    return place

@router.delete("/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_place(place_id: str, session: Session = Depends(get_session)):
    place = session.get(Place, place_id)
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
    
    session.delete(place)
    session.commit()
    return None
