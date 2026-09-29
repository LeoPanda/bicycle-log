from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, func
from app.core.database import get_session
from app.models.activity import Activity
from app.models.place import Place
from app.models.category import PlaceCategory
from app.models.stay_log import StayLog
from app.models.bike import Bike
from app.models.route import Route

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/dashboard")
def get_dashboard_summary(session: Session = Depends(get_session)):
    activities = session.exec(select(Activity)).all()
    places = session.exec(select(Place)).all()
    
    total_distance_m = sum([a.distance for a in activities])
    total_elevation_m = sum([a.total_elevation_gain for a in activities])
    total_ride_count = len(activities)
    total_stay_spots = len(places)

    recent_activities = session.exec(
        select(Activity).order_by(Activity.start_date.desc()).limit(5)
    ).all()

    recent_list = []
    for a in recent_activities:
        bike = session.get(Bike, a.bike_id) if a.bike_id else None
        recent_list.append({
            "id": a.id,
            "name": a.name,
            "start_date": a.start_date,
            "bike_name": bike.name if bike else "未設定",
            "distance_km": round(a.distance / 1000.0, 2),
            "elevation_gain": round(a.total_elevation_gain, 1)
        })

    # Ranking Top 10 visited spots
    stay_logs = session.exec(select(StayLog)).all()
    spot_counts: Dict[str, Dict[str, Any]] = {}
    for s in stay_logs:
        pid = s.place_id
        if pid not in spot_counts:
            p = session.get(Place, pid)
            cat = session.get(PlaceCategory, p.category_id) if (p and p.category_id) else None
            spot_counts[pid] = {
                "place_id": pid,
                "place_name": p.name if p else "不明なスポット",
                "category_name": cat.name if cat else "未分類",
                "visit_count": 0,
                "last_visited_at": s.arrived_at
            }
        spot_counts[pid]["visit_count"] += 1
        if s.arrived_at > spot_counts[pid]["last_visited_at"]:
            spot_counts[pid]["last_visited_at"] = s.arrived_at

    ranking = sorted(list(spot_counts.values()), key=lambda x: x["visit_count"], reverse=True)[:10]

    # Standard route ranking Top 10
    routes = session.exec(select(Route)).all()
    route_ranking_list = []
    for r in routes:
        count = len(session.exec(select(Activity).where(Activity.route_id == r.id)).all())
        route_ranking_list.append({
            "route_id": r.id,
            "name": r.name,
            "activity_count": count
        })
    route_ranking = sorted(route_ranking_list, key=lambda x: x["activity_count"], reverse=True)[:10]

    return {
        "summary": {
            "total_distance_km": round(total_distance_m / 1000.0, 1),
            "total_elevation_gain_m": round(total_elevation_m, 1),
            "total_ride_count": total_ride_count,
            "total_stay_spots": total_stay_spots
        },
        "recent_activities": recent_list,
        "ranking": ranking,
        "route_ranking": route_ranking
    }

@router.get("/metrics")
def get_activity_metrics(
    range_type: str = Query("monthly", description="Time range: annual, monthly, weekly"),
    bike_id: Optional[int] = Query(None, description="Filter by bike ID"),
    session: Session = Depends(get_session)
):
    statement = select(Activity)
    if bike_id is not None:
        statement = statement.where(Activity.bike_id == bike_id)
        
    activities = session.exec(statement.order_by(Activity.start_date.asc())).all()

    # Group activities based on range_type
    grouped: Dict[str, Dict[str, float]] = {}
    for a in activities:
        dt = a.start_date
        if range_type == "annual":
            key = dt.strftime("%Y年")
        elif range_type == "weekly":
            key = f"{dt.year}-W{dt.isocalendar()[1]:02d}"
        else:  # monthly default
            key = dt.strftime("%Y-%m")

        if key not in grouped:
            grouped[key] = {
                "period": key,
                "distance_km": 0.0,
                "elevation_m": 0.0,
                "moving_hours": 0.0,
                "ride_count": 0,
                "calories_kcal": 0.0
            }

        grouped[key]["distance_km"] += a.distance / 1000.0
        grouped[key]["elevation_m"] += a.total_elevation_gain
        grouped[key]["moving_hours"] += (a.moving_time or 0) / 3600.0
        grouped[key]["ride_count"] += 1
        grouped[key]["calories_kcal"] += (a.calories or 0.0)

    # Format values
    results = []
    for period_key in sorted(grouped.keys()):
        item = grouped[period_key]
        item["distance_km"] = round(item["distance_km"], 2)
        item["elevation_m"] = round(item["elevation_m"], 1)
        item["moving_hours"] = round(item["moving_hours"], 2)
        item["calories_kcal"] = round(item["calories_kcal"], 1)
        results.append(item)

    return {
        "range_type": range_type,
        "metrics": results
    }

@router.get("/heatmap")
def get_heatmap_data(
    year: Optional[str] = Query(None, description="Filter by year e.g. 2026 or all"),
    session: Session = Depends(get_session)
):
    all_activities = session.exec(select(Activity)).all()
    available_years_set = set()
    for a in all_activities:
        if a.start_date:
            available_years_set.add(str(a.start_date.year))
    available_years = sorted(list(available_years_set), reverse=True)
    if not available_years:
        available_years = [str(datetime.now().year)]

    selected_year = year
    if not selected_year or selected_year == "latest":
        selected_year = available_years[0]

    # Unlinked activities (route_id IS NULL)
    unlinked_activities = session.exec(
        select(Activity)
        .where(Activity.route_id == None)  # noqa
        .order_by(Activity.start_date.desc())
    ).all()

    if selected_year != "all":
        target_y = int(selected_year)
        unlinked_activities = [a for a in unlinked_activities if a.start_date and a.start_date.year == target_y]

    places = session.exec(select(Place)).all()
    routes = session.exec(select(Route).order_by(Route.id.asc())).all()

    polylines = []
    for a in unlinked_activities:
        if a.summary_polyline:
            polylines.append({
                "activity_id": a.id,
                "name": a.name,
                "start_date": a.start_date,
                "distance_km": round(a.distance / 1000.0, 2) if a.distance else 0.0,
                "polyline": a.summary_polyline,
                "strava_url": f"https://www.strava.com/activities/{a.id}"
            })

    routes_list = []
    for r in routes:
        linked_acts = session.exec(
            select(Activity).where(Activity.route_id == r.id).order_by(Activity.start_date.desc())
        ).all()
        if selected_year != "all":
            target_y = int(selected_year)
            linked_acts = [la for la in linked_acts if la.start_date and la.start_date.year == target_y]
        
        acts_summary = []
        for la in linked_acts:
            acts_summary.append({
                "id": la.id,
                "name": la.name,
                "start_date": la.start_date,
                "distance_km": round(la.distance / 1000.0, 2) if la.distance else 0.0
            })

        if r.summary_polyline and (len(linked_acts) > 0 or selected_year == "all"):
            routes_list.append({
                "route_id": r.id,
                "name": r.name,
                "summary_polyline": r.summary_polyline,
                "activity_count": len(linked_acts),
                "activities": acts_summary
            })

    markers = []
    for p in places:
        cat = session.get(PlaceCategory, p.category_id) if p.category_id else None
        stay_logs = session.exec(select(StayLog).where(StayLog.place_id == p.id)).all()
        if selected_year != "all":
            target_y = int(selected_year)
            stay_logs = [s for s in stay_logs if s.arrived_at and s.arrived_at.year == target_y]

        if len(stay_logs) > 0:
            markers.append({
                "place_id": p.id,
                "name": p.name,
                "address": p.address,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "category_name": cat.name if cat else "未分類",
                "category_icon": cat.icon if cat else "map-pin",
                "visit_count": len(stay_logs)
            })

    return {
        "available_years": available_years,
        "selected_year": selected_year,
        "polylines": polylines,
        "routes": routes_list,
        "markers": markers
    }
