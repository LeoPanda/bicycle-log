from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.database import get_session
from app.schemas.route import RouteResponse, RouteUpdate
from app.services import route_service

router = APIRouter(prefix="/api/routes", tags=["routes"])

@router.get("")
def list_routes(session: Session = Depends(get_session)):
    return route_service.list_routes_data(session=session)

@router.get("/{route_id}")
def get_route_detail(route_id: int, session: Session = Depends(get_session)):
    return route_service.get_route_detail_data(session=session, route_id=route_id)

@router.put("/{route_id}", response_model=RouteResponse)
def update_route(route_id: int, route_update: RouteUpdate, session: Session = Depends(get_session)):
    return route_service.update_route_data(session=session, route_id=route_id, route_update=route_update)

@router.delete("/{route_id}")
def delete_route(route_id: int, session: Session = Depends(get_session)):
    route_service.delete_route_data(session=session, route_id=route_id)
    return {"status": "success", "message": f"Route {route_id} deleted and linked activities unlinked"}

@router.post("/detect")
def trigger_route_detection(session: Session = Depends(get_session)):
    result = route_service.detect_and_group_routes(session=session)
    return {
        "status": "success",
        "detected_routes": result["detected_routes"],
        "grouped_activities": result["grouped_activities"]
    }
