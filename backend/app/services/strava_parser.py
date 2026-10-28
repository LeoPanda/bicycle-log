import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlmodel import Session, select

from app.models.activity import Activity
from app.models.stay_log import StayLog
from app.services.places_service import get_or_create_place_for_stop
from app.services.route_service import decode_polyline

logger = logging.getLogger("app.services.strava_parser")

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
