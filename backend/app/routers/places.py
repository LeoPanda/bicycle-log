from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session
from app.core.database import get_session
from app.schemas.place import (
    PlaceCreate, PlaceUpdate, PlaceResponse, PlaceListResponse,
    OverwritePlaceRequest
)
from app.services import places_service

router = APIRouter(prefix="/api/places", tags=["places"])

@router.get("", response_model=PlaceListResponse)
def list_places(
    q: Optional[str] = Query(None, description="Fuzzy search keyword"),
    category_id: Optional[int] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
):
    return places_service.list_places_data(
        session=session,
        q=q,
        category_id=category_id,
        page=page,
        per_page=per_page
    )

@router.get("/search-nearby")
def search_nearby(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(2000.0, description="Radius in meters"),
    q: Optional[str] = Query(None, description="Search keyword"),
    session: Session = Depends(get_session)
):
    return places_service.search_nearby_places(
        session=session,
        lat=lat,
        lng=lng,
        radius=radius,
        query=q
    )

@router.post("", response_model=PlaceResponse, status_code=status.HTTP_201_CREATED)
def create_place(place_in: PlaceCreate, session: Session = Depends(get_session)):
    return places_service.create_place_data(session=session, place_in=place_in)

@router.get("/{place_id}")
def get_place(place_id: str, session: Session = Depends(get_session)):
    return places_service.get_place_detail_data(session=session, place_id=place_id)

@router.put("/{place_id}/overwrite")
def overwrite_place(
    place_id: str,
    place_in: OverwritePlaceRequest,
    session: Session = Depends(get_session)
):
    return places_service.overwrite_place_data(session=session, place_id=place_id, place_in=place_in)

@router.put("/{place_id}", response_model=PlaceResponse)
def update_place(place_id: str, place_in: PlaceUpdate, session: Session = Depends(get_session)):
    return places_service.update_place_data(session=session, place_id=place_id, place_in=place_in)

@router.delete("/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_place(place_id: str, session: Session = Depends(get_session)):
    places_service.delete_place_data(session=session, place_id=place_id)
    return None
