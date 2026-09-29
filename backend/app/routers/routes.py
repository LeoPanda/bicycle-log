from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.route import Route, RouteUpdate
from app.models.activity import Activity
from app.services.route_service import detect_and_group_routes

router = APIRouter(prefix="/api/routes", tags=["routes"])

@router.get("")
def list_routes(session: Session = Depends(get_session)):
    routes = session.exec(select(Route).order_by(Route.id.asc())).all()
    result = []
    for r in routes:
        linked_activities = session.exec(
            select(Activity).where(Activity.route_id == r.id).order_by(Activity.start_date.desc())
        ).all()
        result.append({
            "id": r.id,
            "name": r.name,
            "summary_polyline": r.summary_polyline,
            "activity_count": len(linked_activities),
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })
    return result

@router.get("/{route_id}")
def get_route_detail(route_id: int, session: Session = Depends(get_session)):
    route = session.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    
    linked_activities = session.exec(
        select(Activity).where(Activity.route_id == route_id).order_by(Activity.start_date.desc())
    ).all()

    activities_list = []
    for a in linked_activities:
        activities_list.append({
            "id": a.id,
            "name": a.name,
            "start_date": a.start_date,
            "distance_km": round(a.distance / 1000.0, 2) if a.distance else 0.0,
            "moving_time": a.moving_time,
            "total_elevation_gain": a.total_elevation_gain,
            "summary_polyline": a.summary_polyline,
            "strava_url": f"https://www.strava.com/activities/{a.id}"
        })

    return {
        "id": route.id,
        "name": route.name,
        "summary_polyline": route.summary_polyline,
        "activity_count": len(linked_activities),
        "activities": activities_list,
        "created_at": route.created_at,
        "updated_at": route.updated_at
    }

@router.put("/{route_id}")
def update_route(route_id: int, route_update: RouteUpdate, session: Session = Depends(get_session)):
    route = session.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

    if route_update.name is not None:
        route.name = route_update.name
    if route_update.summary_polyline is not None:
        route.summary_polyline = route_update.summary_polyline

    route.updated_at = datetime.now()
    session.add(route)
    session.commit()
    session.refresh(route)
    return route

@router.delete("/{route_id}")
def delete_route(route_id: int, session: Session = Depends(get_session)):
    route = session.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")

    # Unlink activities before deletion
    linked_activities = session.exec(select(Activity).where(Activity.route_id == route_id)).all()
    for a in linked_activities:
        a.route_id = None
        session.add(a)

    session.delete(route)
    session.commit()
    return {"status": "success", "message": f"Route {route_id} deleted and linked activities unlinked"}

@router.post("/detect")
def trigger_route_detection(session: Session = Depends(get_session)):
    result = detect_and_group_routes(session)
    return {
        "status": "success",
        "detected_routes": result["detected_routes"],
        "grouped_activities": result["grouped_activities"]
    }
