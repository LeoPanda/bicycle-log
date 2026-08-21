from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, or_
from app.core.database import get_session
from app.models.place import Place, PlaceCreate, PlaceUpdate
from app.models.category import PlaceCategory
from app.models.stay_log import StayLog

router = APIRouter(prefix="/api/places", tags=["places"])

@router.get("")
def list_places(
    q: Optional[str] = Query(None, description="Fuzzy search keyword"),
    category_id: Optional[int] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
):
    statement = select(Place)
    
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
        
    # Count total
    total = len(session.exec(statement).all())
    
    # Paginate
    offset = (page - 1) * per_page
    places = session.exec(statement.order_by(Place.created_at.desc()).offset(offset).limit(per_page)).all()
    
    results = []
    for p in places:
        cat = session.get(PlaceCategory, p.category_id) if p.category_id else None
        stay_count = len(session.exec(select(StayLog).where(StayLog.place_id == p.id)).all())
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
    p_dict["stay_logs"] = stay_logs
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
