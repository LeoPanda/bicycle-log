import time
import logging
import httpx
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlmodel import Session, select, or_

from app.core.config import settings
from app.models.activity import Activity
from app.models.bike import Bike
from app.models.place import Place
from app.models.stay_log import StayLog
from app.models.route import Route
from app.services.stop_detection import detect_stops
from app.services.places_service import get_or_create_place_for_stop
from app.services.route_service import calculate_polyline_similarity, decode_polyline

logger = logging.getLogger("app.services.strava")

def has_strava_credentials() -> bool:
    return bool(settings.STRAVA_CLIENT_ID and settings.STRAVA_CLIENT_SECRET and settings.STRAVA_REFRESH_TOKEN)

def sync_strava_activities(
    session: Session,
    limit_months: Optional[int] = None,
    all_time: bool = False,
    before_timestamp: Optional[int] = None
) -> Dict[str, Any]:
    """
    Syncs real Strava activities directly from the Strava API v3 using credentials in .env.
    Fetches real athlete activities and real GPS streams for stop detection & Google Places generation.
    Does NOT use mock data or artificial fallbacks.
    """
    # 1. Credentials Check
    if not has_strava_credentials():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Strava API credentials (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN) are missing in .env"
        )

    # 2. Calculate time range
    latest_activity = session.exec(
        select(Activity).order_by(Activity.start_date.desc())
    ).first()

    after_timestamp = 0
    if all_time or before_timestamp:
        after_timestamp = 0
    elif limit_months:
        jst = timezone(timedelta(hours=9))
        cutoff_date = datetime.now(jst) - timedelta(days=30 * limit_months)
        after_timestamp = int(cutoff_date.timestamp())
    elif latest_activity:
        start_dt = latest_activity.start_date
        if start_dt.tzinfo is None:
            jst = timezone(timedelta(hours=9))
            start_dt = start_dt.replace(tzinfo=jst)
        # Add +1 second to exclude latest activity itself
        after_timestamp = int(start_dt.timestamp()) + 1

    bikes = session.exec(select(Bike)).all()
    default_bike = bikes[0] if bikes else None

    try:
        # OAuth Token Exchange
        token_url = "https://www.strava.com/oauth/token"
        token_params = {
            "client_id": settings.STRAVA_CLIENT_ID,
            "client_secret": settings.STRAVA_CLIENT_SECRET,
            "refresh_token": settings.STRAVA_REFRESH_TOKEN,
            "grant_type": "refresh_token"
        }
        with httpx.Client(timeout=30.0) as client:
            t_res = client.post(token_url, data=token_params)
            if t_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Strava OAuth Token Exchange failed: {t_res.status_code} - {t_res.text}"
                )
            access_token = t_res.json()["access_token"]

            # Fetch Athlete Activities with Pagination
            acts_url = "https://www.strava.com/api/v3/athlete/activities"
            headers = {"Authorization": f"Bearer {access_token}"}
            
            real_activities = []
            page = 1
            per_page = 100

            while True:
                params = {"per_page": per_page, "page": page}
                if after_timestamp > 0:
                    params["after"] = after_timestamp
                if before_timestamp and before_timestamp > 0:
                    params["before"] = before_timestamp

                a_res = client.get(acts_url, headers=headers, params=params)
                if a_res.status_code != 200:
                    err_detail = a_res.json().get("message", a_res.text) if a_res.headers.get("content-type", "").startswith("application/json") else a_res.text
                    raise HTTPException(
                        status_code=a_res.status_code,
                        detail=f"Strava Activities API error ({a_res.status_code}): {err_detail}. Note: Ensure your STRAVA_REFRESH_TOKEN in .env has 'activity:read_all' or 'activity:read' scope."
                    )

                page_activities = a_res.json()
                if not isinstance(page_activities, list) or len(page_activities) == 0:
                    break

                real_activities.extend(page_activities)

                if len(page_activities) < per_page:
                    break
                page += 1

            initial_places_count = len(session.exec(select(Place)).all())
            synced_activities = 0
            detected_stops_count = 0

            for act_data in real_activities:
                act_id = act_data["id"]

                # 1. スポーツ種別を Ride のみに限定
                act_type = act_data.get("sport_type") or act_data.get("type")
                if act_type != "Ride":
                    continue

                existing = session.get(Activity, act_id)
                if existing:
                    continue

                start_date_raw = act_data.get("start_date_local") or act_data.get("start_date")
                start_date = datetime.fromisoformat(start_date_raw.replace("Z", "+09:00"))

                # ギアID (gear_id) に基づく Bike の判定・自動登録
                gear_id = act_data.get("gear_id")
                assigned_bike_id = None

                if gear_id:
                    matched_bike = session.exec(
                        select(Bike).where(
                            or_(
                                Bike.strava_gear_id == gear_id,
                                Bike.bike_code == gear_id
                            )
                        )
                    ).first()

                    if matched_bike:
                        assigned_bike_id = matched_bike.id
                    else:
                        gear_info = _fetch_strava_gear(client, access_token, gear_id)
                        bike_name = gear_info.get("name") if gear_info and gear_info.get("name") else f"Strava Bike ({gear_id})"
                        brand = gear_info.get("brand_name") if gear_info else None
                        model = gear_info.get("model_name") if gear_info else None
                        notes = gear_info.get("description") if gear_info else "Strava APIより自動登録"

                        new_bike = Bike(
                            bike_code=gear_id,
                            name=bike_name,
                            brand=brand,
                            model=model,
                            notes=notes,
                            strava_gear_id=gear_id,
                            registered_at=datetime.now()
                        )
                        session.add(new_bike)
                        session.commit()
                        session.refresh(new_bike)
                        assigned_bike_id = new_bike.id

                if assigned_bike_id is None and default_bike:
                    assigned_bike_id = default_bike.id

                detail_data = _fetch_strava_activity_detail(client, access_token, act_id)
                calories = None
                if detail_data:
                    calories = detail_data.get("calories")
                    if calories is None or calories == 0:
                        calories = detail_data.get("kilojoules")
                if calories is None:
                    calories = act_data.get("calories") or act_data.get("kilojoules")

                summary_poly = act_data.get("map", {}).get("summary_polyline", None)
                matched_route_id: Optional[int] = None

                if summary_poly:
                    routes = session.exec(select(Route).where(Route.summary_polyline != None)).all()  # noqa
                    best_sim = 0.0
                    act_name_str = act_data.get("name", "Strava Ride")
                    for r in routes:
                        sim = calculate_polyline_similarity(
                            summary_poly,
                            r.summary_polyline,
                            label1=f"New Strava Act #{act_id} ('{act_name_str}')",
                            label2=f"Route #{r.id} ('{r.name}')"
                        )
                        if sim >= 0.70 and sim > best_sim:
                            best_sim = sim
                            matched_route_id = r.id

                activity = Activity(
                    id=act_id,
                    name=act_data.get("name", "Strava Ride"),
                    bike_id=assigned_bike_id,
                    route_id=matched_route_id,
                    start_date=start_date,
                    distance=act_data.get("distance", 0.0),
                    moving_time=act_data.get("moving_time", 0),
                    elapsed_time=act_data.get("elapsed_time", 0),
                    total_elevation_gain=act_data.get("total_elevation_gain", 0.0),
                    calories=calories,
                    summary_polyline=summary_poly
                )
                session.add(activity)
                session.commit()
                session.refresh(activity)
                synced_activities += 1

                # Fetch real streams for stop detection
                streams = _fetch_strava_streams(client, access_token, act_id)
                latlng_stream = streams.get("latlng", {}).get("data", [])
                time_stream = streams.get("time", {}).get("data", [])
                
                if latlng_stream and time_stream:
                    detected = detect_stops(latlng_stream, time_stream, start_date)
                    for stop in detected:
                        place = get_or_create_place_for_stop(session, stop["stay_latitude"], stop["stay_longitude"])
                        stay_log = StayLog(
                            activity_id=activity.id,
                            place_id=place.id,
                            arrived_at=stop["arrived_at"],
                            left_at=stop["left_at"],
                            stay_duration_seconds=stop["stay_duration_seconds"],
                            stay_latitude=stop["stay_latitude"],
                            stay_longitude=stop["stay_longitude"],
                            notes=f"{place.name}での滞在記録"
                        )
                        session.add(stay_log)
                        detected_stops_count += 1
                    session.commit()

                # Process start and end points as StayLog
                endpoint_count = process_activity_endpoints(session, activity)
                detected_stops_count += endpoint_count

            final_places_count = len(session.exec(select(Place)).all())
            new_places_created = max(0, final_places_count - initial_places_count)

            return {
                "status": "success",
                "synced_activities": synced_activities,
                "detected_stops": detected_stops_count,
                "created_places": new_places_created
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Strava API sync error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync real Strava API: {str(e)}"
        )

def _fetch_strava_streams(client: httpx.Client, access_token: str, activity_id: int) -> Dict[str, Any]:
    """Fetches real GPS latlng and time streams for an activity from Strava API."""
    url = f"https://www.strava.com/api/v3/activities/{activity_id}/streams"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "keys": "latlng,time,moving",
        "key_by_type": "true"
    }
    try:
        res = client.get(url, headers=headers, params=params)
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, dict):
                return data
            elif isinstance(data, list):
                result = {}
                for item in data:
                    if isinstance(item, dict) and "type" in item:
                        result[item["type"]] = item
                return result
    except Exception as e:
        logger.warning(f"Failed to fetch Strava streams for activity {activity_id}: {e}")
    return {}

def _fetch_strava_gear(client: httpx.Client, access_token: str, gear_id: str) -> Optional[Dict[str, Any]]:
    """Fetches real gear details from Strava API by gear_id."""
    url = f"https://www.strava.com/api/v3/gear/{gear_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        res = client.get(url, headers=headers)
        if res.status_code == 200:
            return res.json()
        logger.warning(f"Strava Gear API returned status {res.status_code} for gear_id {gear_id}: {res.text}")
    except Exception as e:
        logger.warning(f"Failed to fetch Strava gear {gear_id}: {e}")
    return None

def _fetch_strava_activity_detail(client: httpx.Client, access_token: str, activity_id: int) -> Optional[Dict[str, Any]]:
    """Fetches detailed activity information including calories from Strava API."""
    url = f"https://www.strava.com/api/v3/activities/{activity_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        res = client.get(url, headers=headers)
        if res.status_code == 200:
            return res.json()
        logger.warning(f"Strava Activity Detail API returned status {res.status_code} for activity {activity_id}: {res.text}")
    except Exception as e:
        logger.warning(f"Failed to fetch Strava activity detail for {activity_id}: {e}")
    return None

def process_activity_endpoints(
    session: Session,
    activity: Activity,
    force_update: bool = False
) -> int:
    """
    Detects start and end points from activity.summary_polyline,
    fetches or creates Places via Google Places API / Double Caching,
    and registers 2 StayLog records (Start: 0s, Goal: 0s).
    Returns count of new StayLog records created (0, 1, or 2).
    """
    if not activity.summary_polyline:
        return 0

    coords = decode_polyline(activity.summary_polyline)
    if len(coords) < 2:
        return 0

    start_lat, start_lng = coords[0]
    end_lat, end_lng = coords[-1]

    # Check existing endpoint stay_logs
    existing_logs = session.exec(
        select(StayLog).where(StayLog.activity_id == activity.id)
    ).all()

    has_start = any("(スタート地点)" in (log.notes or "") for log in existing_logs)
    has_end = any("(ゴール地点)" in (log.notes or "") for log in existing_logs)

    created_count = 0

    # 1. Start Point (StayLog)
    if not has_start or force_update:
        place_start = get_or_create_place_for_stop(session, start_lat, start_lng)
        start_time = activity.start_date
        stay_start = StayLog(
            activity_id=activity.id,
            place_id=place_start.id,
            arrived_at=start_time,
            left_at=start_time,
            stay_duration_seconds=0,
            stay_latitude=start_lat,
            stay_longitude=start_lng,
            notes=f"{place_start.name} (スタート地点)"
        )
        session.add(stay_start)
        created_count += 1

    # 2. End Point (StayLog)
    if not has_end or force_update:
        place_end = get_or_create_place_for_stop(session, end_lat, end_lng)
        elapsed = activity.elapsed_time if activity.elapsed_time else (activity.moving_time or 0)
        end_time = activity.start_date + timedelta(seconds=elapsed)
        stay_end = StayLog(
            activity_id=activity.id,
            place_id=place_end.id,
            arrived_at=end_time,
            left_at=end_time,
            stay_duration_seconds=0,
            stay_latitude=end_lat,
            stay_longitude=end_lng,
            notes=f"{place_end.name} (ゴール地点)"
        )
        session.add(stay_end)
        created_count += 1

    if created_count > 0:
        session.commit()

    return created_count

def backfill_activity_endpoints(
    session: Session,
    all_activities: bool = True,
    limit_months: Optional[int] = None
) -> Dict[str, Any]:
    """
    Backfills start and end stay logs for existing activities.
    """
    query = select(Activity)
    if not all_activities and limit_months:
        jst = timezone(timedelta(hours=9))
        cutoff = datetime.now(jst) - timedelta(days=30 * limit_months)
        query = query.where(Activity.start_date >= cutoff)

    activities = session.exec(query.order_by(Activity.start_date.desc())).all()
    total_processed = 0
    total_endpoints_created = 0

    for act in activities:
        created = process_activity_endpoints(session, act)
        if created > 0:
            total_endpoints_created += created
        total_processed += 1

    return {
        "status": "success",
        "processed_activities": total_processed,
        "created_endpoint_logs": total_endpoints_created
    }


