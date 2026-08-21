import uuid
import logging
import httpx
from typing import Optional
from sqlmodel import Session, select
from app.models.place import Place
from app.models.category import PlaceCategory
from app.services.stop_detection import haversine_distance
from app.core.config import settings

logger = logging.getLogger("app.services.places")

def get_or_create_place_for_stop(
    session: Session,
    lat: float,
    lng: float,
    search_radius_meters: float = 50.0
) -> Place:
    """
    Implements double-caching mechanism:
    1. Search local DB `places` within 50m radius.
    2. If hit, return existing place without calling external API.
    3. If miss, call Google Places Nearby Search API if key is available.
    4. If Google API fails or returns no result, fallback to "未分類の滞在スポット".
    """
    # 1. Primary Cache: Search DB places within search_radius_meters
    all_places = session.exec(select(Place)).all()
    for place in all_places:
        dist = haversine_distance(lat, lng, place.latitude, place.longitude)
        if dist <= search_radius_meters:
            logger.info(f"Primary cache hit for spot within {dist:.1f}m: {place.name} ({place.id})")
            return place

    # 2. Secondary Cache / External API: Google Places Nearby Search
    place_name = "未分類の滞在スポット"
    address = f"緯度: {lat}, 経度: {lng}"
    place_id = f"place_{uuid.uuid4().hex[:12]}"
    category_name = "未分類"

    if settings.GOOGLE_PLACES_API_KEY:
        try:
            url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
            params = {
                "location": f"{lat},{lng}",
                "radius": int(search_radius_meters),
                "key": settings.GOOGLE_PLACES_API_KEY,
                "language": "ja"
            }
            with httpx.Client(timeout=5.0) as client:
                res = client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("results", [])
                    if results:
                        top = results[0]
                        place_id = top.get("place_id", place_id)
                        place_name = top.get("name", place_name)
                        address = top.get("vicinity", address)
                        types = top.get("types", [])
                        category_name = _map_google_types_to_category(types)
        except Exception as e:
            logger.warning(f"Failed to query Google Places API: {e}")

    # Find matching category in DB
    category = session.exec(select(PlaceCategory).where(PlaceCategory.name == category_name)).first()
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
    
    logger.info(f"Created new place record: {new_place.name} ({new_place.id})")
    return new_place

def _map_google_types_to_category(types: list) -> str:
    types_set = set(types)
    if "cafe" in types_set or "bakery" in types_set:
        return "カフェ"
    elif "restaurant" in types_set or "food" in types_set or "meal_takeaway" in types_set:
        return "レストラン"
    elif "convenience_store" in types_set or "supermarket" in types_set:
        return "コンビニ"
    elif "park" in types_set or "campground" in types_set:
        return "公園"
    elif "tourist_attraction" in types_set or "point_of_interest" in types_set:
        return "道の駅"
    return "未分類"
