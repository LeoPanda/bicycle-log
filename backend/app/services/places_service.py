import uuid
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlmodel import Session, select, or_, func
from fastapi import HTTPException, status
from app.models.place import Place
from app.models.category import PlaceCategory
from app.models.stay_log import StayLog, StayLogImage
from app.models.activity import Activity
from app.schemas.place import PlaceCreate, PlaceUpdate, OverwritePlaceRequest
from app.services.stop_detection import haversine_distance
from app.services.google_places_client import (
    fetch_nearby_place_from_google,
    search_google_places_api,
    map_google_types_to_category
)

logger = logging.getLogger("app.services.places")

def get_or_create_place_for_stop(
    session: Session,
    lat: float,
    lng: float,
    search_radius_meters: float = 50.0
) -> Place:
    all_places = session.exec(select(Place)).all()
    for place in all_places:
        dist = haversine_distance(lat, lng, place.latitude, place.longitude)
        if dist <= search_radius_meters:
            logger.info(f"Primary cache hit for spot within {dist:.1f}m: {place.name} ({place.id})")
            return place

    place_name = "未分類の滞在スポット"
    address = f"緯度: {lat:.4f}, 経度: {lng:.4f}"
    place_id = f"place_{uuid.uuid4().hex[:12]}"
    category_name = "未分類"

    google_res = fetch_nearby_place_from_google(lat, lng, search_radius_meters, session=session)
    if google_res:
        p_id, p_name, p_addr, c_name = google_res
        place_id = p_id or place_id
        place_name = p_name or place_name
        address = p_addr or address
        category_name = c_name or category_name
        logger.info(f"Google Places API hit: {place_name} ({place_id}) - {category_name}")

    existing_place = session.get(Place, place_id)
    if existing_place:
        return existing_place

    category = session.exec(select(PlaceCategory).where(PlaceCategory.name == category_name)).first()
    if not category:
        category = session.exec(select(PlaceCategory).where(PlaceCategory.name == "その他")).first()
    if not category:
        category = session.exec(select(PlaceCategory).where(PlaceCategory.name == "未分類")).first()

    new_place = Place(
        id=place_id,
        name=place_name,
        category_id=category.id if category else None,
        address=address,
        latitude=lat,
        longitude=lng
    )
    session.add(new_place)
    session.commit()
    session.refresh(new_place)
    return new_place

def search_nearby_places(
    session: Session,
    lat: float,
    lng: float,
    radius: float = 2000.0,
    query: Optional[str] = None
) -> List[Dict[str, Any]]:
    results = search_google_places_api(lat, lng, radius, query)

    # Local DB fallback / merge
    db_places = session.exec(select(Place)).all()
    db_results = []
    for p in db_places:
        dist = haversine_distance(lat, lng, p.latitude, p.longitude)
        if dist <= radius:
            if query and query.strip():
                q_lower = query.strip().lower()
                if q_lower not in p.name.lower() and (not p.address or q_lower not in p.address.lower()):
                    continue
            cat = session.get(PlaceCategory, p.category_id) if p.category_id else None
            db_results.append({
                "id": p.id,
                "name": p.name,
                "address": p.address or "",
                "latitude": p.latitude,
                "longitude": p.longitude,
                "category_name": cat.name if cat else "未分類",
                "source": "local_db"
            })

    # Combine unique places
    seen_ids = set()
    combined = []
    for item in results + db_results:
        item_id = item.get("id")
        if item_id and item_id not in seen_ids:
            seen_ids.add(item_id)
            combined.append(item)
    return combined

def list_places_data(
    session: Session,
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    page: int = 1,
    per_page: int = 20
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
    total = len(session.exec(statement).all())
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

def get_place_detail_data(session: Session, place_id: str):
    place = session.get(Place, place_id)
    if not place:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    cat = session.get(PlaceCategory, place.category_id) if place.category_id else None
    stay_logs = session.exec(
        select(StayLog).where(StayLog.place_id == place_id).order_by(StayLog.arrived_at.desc())
    ).all()
    detailed_stays = []
    for s in stay_logs:
        activity = session.get(Activity, s.activity_id) if s.activity_id else None
        images = session.exec(
            select(StayLogImage).where(StayLogImage.stay_log_id == s.id).order_by(StayLogImage.display_order.asc())
        ).all()
        s_dict = s.model_dump()
        s_dict["activity_name"] = activity.name if activity else f"アクティビティ #{s.activity_id}"
        s_dict["activity_start_date"] = activity.start_date.isoformat() if (activity and activity.start_date) else None
        s_dict["images"] = images
        detailed_stays.append(s_dict)
    p_dict = place.model_dump()
    p_dict["category_name"] = cat.name if cat else "未分類"
    p_dict["category_icon"] = cat.icon if cat else "map-pin"
    p_dict["visit_count"] = len(stay_logs)
    p_dict["stay_logs"] = detailed_stays
    return p_dict

def create_place_data(session: Session, place_in: PlaceCreate):
    existing = session.get(Place, place_in.id)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Place ID already exists")
    place = Place.model_validate(place_in)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place

def update_place_data(session: Session, place_id: str, place_in: PlaceUpdate):
    place = session.get(Place, place_id)
    if not place:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    place_data = place_in.model_dump(exclude_unset=True)
    for key, value in place_data.items():
        setattr(place, key, value)
    place.updated_at = datetime.now()
    session.add(place)
    session.commit()
    session.refresh(place)
    return place

def delete_place_data(session: Session, place_id: str):
    place = session.get(Place, place_id)
    if not place:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Place not found")
    session.delete(place)
    session.commit()

def overwrite_place_data(session: Session, place_id: str, place_in: OverwritePlaceRequest):
    current_place = session.get(Place, place_id)
    if not current_place:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current place not found")

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

    return get_place_detail_data(session, target_place.id)
