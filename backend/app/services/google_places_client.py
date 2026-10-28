import logging
import httpx
from typing import Optional, List, Dict, Any, Tuple
from sqlmodel import Session, select
from app.models.category import PlaceCategory
from app.core.config import settings

logger = logging.getLogger("app.services.google_places")

CATEGORY_TYPE_MAP = {
    "宿泊施設": [
        "lodging", "hotel", "motel", "resort_hotel", "bed_and_breakfast",
        "guest_house", "hostel", "inn"
    ],
    "カフェ": [
        "cafe", "coffee_shop", "bakery"
    ],
    "レストラン": [
        "restaurant", "meal_takeaway", "meal_delivery", "food", "ramen_restaurant",
        "pizza_restaurant", "bar", "fast_food_restaurant", "diner"
    ],
    "コンビニ": [
        "convenience_store", "supermarket", "grocery_store"
    ],
    "公園": [
        "park", "campground", "national_park", "picnic_ground", "nature_reserve"
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

def map_google_types_to_category(types: list, session: Optional[Session] = None) -> str:
    types_set = set(types)
    ordered_category_names = []
    if session:
        try:
            db_cats = session.exec(select(PlaceCategory).order_by(PlaceCategory.sort_order.asc(), PlaceCategory.id.asc())).all()
            ordered_category_names = [c.name for c in db_cats]
        except Exception as e:
            logger.warning(f"Failed to query category sort_order from DB: {e}")

    if not ordered_category_names:
        ordered_category_names = list(CATEGORY_TYPE_MAP.keys()) + ["その他"]

    for cat_name in ordered_category_names:
        target_types = CATEGORY_TYPE_MAP.get(cat_name, [])
        if any(t in types_set for t in target_types):
            return cat_name

    return "その他"

def fetch_nearby_place_from_google(
    lat: float,
    lng: float,
    search_radius_meters: float,
    session: Optional[Session] = None
) -> Optional[Tuple[str, str, str, str]]:
    """
    Returns (place_id, place_name, address, category_name) or None
    """
    if not settings.GOOGLE_PLACES_API_KEY:
        return None

    try:
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
                    body["locationRestriction"]["circle"]["radius"] = 200.0
                    res_wider = client.post(url_new, json=body, headers=headers)
                    if res_wider.status_code == 200:
                        places = res_wider.json().get("places", [])

                if places:
                    top = places[0]
                    p_id = top.get("id", "")
                    display_name = top.get("displayName", {})
                    p_name = display_name.get("text", "") if isinstance(display_name, dict) else str(display_name)
                    p_addr = top.get("formattedAddress", f"緯度: {lat:.4f}, 経度: {lng:.4f}")
                    types = top.get("types", [])
                    c_name = map_google_types_to_category(types, session=session)
                    return (p_id, p_name, p_addr, c_name)
            else:
                logger.warning(f"Failed Google Places API: {res.status_code} - {res.text}")
    except Exception as e:
        logger.warning(f"Failed to query Google Places API: {e}")
    return None

def search_google_places_api(
    lat: float,
    lng: float,
    radius: float = 2000.0,
    query: Optional[str] = None
) -> List[Dict[str, Any]]:
    if not settings.GOOGLE_PLACES_API_KEY:
        return []

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
                data = res.json()
                raw_places = data.get("places", [])
                results = []
                for p in raw_places:
                    disp = p.get("displayName", {})
                    name = disp.get("text", "") if isinstance(disp, dict) else str(disp)
                    loc = p.get("location", {})
                    plat = loc.get("latitude", lat)
                    plng = loc.get("longitude", lng)
                    addr = p.get("formattedAddress", "")
                    types = p.get("types", [])
                    cat_name = map_google_types_to_category(types)
                    results.append({
                        "id": p.get("id"),
                        "name": name,
                        "address": addr,
                        "latitude": plat,
                        "longitude": plng,
                        "category_name": cat_name,
                        "source": "google_places"
                    })
                return results
    except Exception as e:
        logger.warning(f"Error querying Google Places: {e}")
    return []
