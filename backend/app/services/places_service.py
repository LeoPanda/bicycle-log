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

    # 2. Secondary Cache / External API: Google Places Nearby Search (New API)
    place_name = "未分類の滞在スポット"
    address = f"緯度: {lat:.4f}, 経度: {lng:.4f}"
    place_id = f"place_{uuid.uuid4().hex[:12]}"
    category_name = "未分類"

    if settings.GOOGLE_PLACES_API_KEY:
        try:
            # Google Places API (New) Nearby Search
            url_new = "https://places.googleapis.com/v1/places:searchNearby"
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types"
            }
            body = {
                "locationRestriction": {
                    "circle": {
                        "center": {"latitude": lat, "longitude": lng},
                        "radius": float(search_radius_meters)
                    }
                },
                "languageCode": "ja"
            }
            with httpx.Client(timeout=5.0) as client:
                res = client.post(url_new, json=body, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    places = data.get("places", [])
                    if not places:
                        # Try wider radius 200m if 50m yields no exact result
                        body["locationRestriction"]["circle"]["radius"] = 200.0
                        res_wider = client.post(url_new, json=body, headers=headers)
                        if res_wider.status_code == 200:
                            places = res_wider.json().get("places", [])

                    if places:
                        top = places[0]
                        place_id = top.get("id", place_id)
                        display_name = top.get("displayName", {})
                        if isinstance(display_name, dict):
                            place_name = display_name.get("text", place_name)
                        elif isinstance(display_name, str):
                            place_name = display_name
                        address = top.get("formattedAddress", address)
                        types = top.get("types", [])
                        category_name = _map_google_types_to_category(types, session=session)
                        logger.info(f"Google Places API (New) hit: {place_name} ({place_id}) - {category_name}")
                else:
                    logger.warning(f"Failed Google Places API (New): {res.status_code} - {res.text}")
        except Exception as e:
            logger.warning(f"Failed to query Google Places API: {e}")

    # 3. Check if Place already exists in DB by ID
    existing_place = session.get(Place, place_id)
    if existing_place:
        logger.info(f"Existing place found by ID: {existing_place.name} ({place_id})")
        return existing_place

    # Find matching category in DB
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
    
    logger.info(f"Created new place record: {new_place.name} ({new_place.id})")
    return new_place

def search_nearby_places(
    session: Session,
    lat: float,
    lng: float,
    radius: float = 2000.0,
    query: Optional[str] = None
) -> list[dict]:
    """
    Search places within `radius` meters from (lat, lng).
    If `query` is provided, performs Google Places Text Search (or DB keyword search).
    Otherwise, performs Google Places Nearby Search.
    Falls back to local DB if API key is not present or API call fails.
    """
    results = []

    if settings.GOOGLE_PLACES_API_KEY:
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types"
            }
            if query and query.strip():
                url = "https://places.googleapis.com/v1/places:searchText"
                body = {
                    "textQuery": query.strip(),
                    "locationBias": {
                        "circle": {
                            "center": {"latitude": lat, "longitude": lng},
                            "radius": float(radius)
                        }
                    },
                    "languageCode": "ja",
                    "maxResultCount": 20
                }
            else:
                url = "https://places.googleapis.com/v1/places:searchNearby"
                body = {
                    "locationRestriction": {
                        "circle": {
                            "center": {"latitude": lat, "longitude": lng},
                            "radius": float(radius)
                        }
                    },
                    "languageCode": "ja",
                    "maxResultCount": 20
                }

            with httpx.Client(timeout=5.0) as client:
                res = client.post(url, json=body, headers=headers)
                if res.status_code == 200:
                    places_data = res.json().get("places", [])
                    for item in places_data:
                        place_id = item.get("id", "")
                        display_name = item.get("displayName", {})
                        name = display_name.get("text", "") if isinstance(display_name, dict) else str(display_name)
                        address = item.get("formattedAddress", "")
                        loc = item.get("location", {})
                        item_lat = loc.get("latitude", lat)
                        item_lng = loc.get("longitude", lng)
                        types = item.get("types", [])
                        cat_name = _map_google_types_to_category(types, session=session)
                        dist = haversine_distance(lat, lng, item_lat, item_lng)

                        results.append({
                            "id": place_id,
                            "name": name,
                            "address": address,
                            "latitude": item_lat,
                            "longitude": item_lng,
                            "category_name": cat_name,
                            "types": types,
                            "distance_meters": round(dist, 1)
                        })
                    return results
                else:
                    logger.warning(f"Google Places API search failed ({res.status_code}): {res.text}")
        except Exception as e:
            logger.warning(f"Google Places API search exception: {e}")

    # Fallback: search local DB places
    all_places = session.exec(select(Place)).all()
    for place in all_places:
        dist = haversine_distance(lat, lng, place.latitude, place.longitude)
        if dist <= radius:
            if query and query.strip():
                q_lower = query.strip().lower()
                if q_lower not in place.name.lower() and (not place.address or q_lower not in place.address.lower()):
                    continue
            cat = session.get(PlaceCategory, place.category_id) if place.category_id else None
            results.append({
                "id": place.id,
                "name": place.name,
                "address": place.address or "",
                "latitude": place.latitude,
                "longitude": place.longitude,
                "category_name": cat.name if cat else "未分類",
                "types": [],
                "distance_meters": round(dist, 1)
            })

    results.sort(key=lambda x: x["distance_meters"])
    return results

CATEGORY_TYPE_MAP = {
    "宿泊施設": [
        "lodging", "hotel", "inn", "motel", "resort_hotel", "bed_and_breakfast",
        "hostel", "guest_house", "extended_stay_hotel"
    ],
    "カフェ": [
        "cafe", "coffee_shop", "bakery", "pastry_shop", "espresso_bar", "tea_house"
    ],
    "レストラン": [
        "restaurant", "food", "meal_takeaway", "meal_delivery", "ramen_restaurant",
        "japanese_restaurant", "fast_food_restaurant", "diner", "izakaya", "bar",
        "pub", "food_court", "bistro", "steak_house", "sushi_restaurant", "pizza_restaurant"
    ],
    "コンビニ": [
        "convenience_store", "supermarket", "grocery_store", "discount_store"
    ],
    "公園": [
        "park", "campground", "hiking_area", "national_park", "garden", "state_park",
        "dog_park", "nature_preserve"
    ],
    "映画館": [
        "movie_theater", "cinema"
    ],
    "博物館・美術館": [
        "museum", "art_gallery", "cultural_center"
    ],
    "寺社・仏閣": [
        "place_of_worship", "hindu_temple", "church", "synagogue", "shinto_shrine",
        "buddhist_temple", "monastery", "mosque"
    ],
    "駅": [
        "train_station", "transit_station", "subway_station", "bus_station",
        "light_rail_station", "railway_station"
    ],
    "休憩スポット": [
        "rest_stop", "visitor_center", "roadside_station", "rest_area"
    ],
}

def _map_google_types_to_category(types: list, session: Optional[Session] = None) -> str:
    types_set = set(types)

    # データベースから優先順位 (sort_order) 昇順でカテゴリ名を取得
    ordered_category_names = []
    if session:
        try:
            db_cats = session.exec(select(PlaceCategory).order_by(PlaceCategory.sort_order.asc(), PlaceCategory.id.asc())).all()
            ordered_category_names = [c.name for c in db_cats]
        except Exception as e:
            logger.warning(f"Failed to query category sort_order from DB: {e}")

    if not ordered_category_names:
        ordered_category_names = list(CATEGORY_TYPE_MAP.keys()) + ["その他"]

    # 優先順位（sort_order昇順）の順に判定を行う
    for cat_name in ordered_category_names:
        target_types = CATEGORY_TYPE_MAP.get(cat_name, [])
        if any(t in types_set for t in target_types):
            return cat_name

    return "その他"

