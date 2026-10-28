from typing import List

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.database import get_session
from app.schemas.bike import BikeCreate, BikeResponse, BikeUpdate
from app.services import bike_service

router = APIRouter(prefix="/api/bikes", tags=["bikes"])

@router.get("", response_model=List[BikeResponse])
def list_bikes(session: Session = Depends(get_session)):
    return bike_service.list_bikes(session)

@router.post("", response_model=BikeResponse, status_code=status.HTTP_201_CREATED)
def create_bike(bike_in: BikeCreate, session: Session = Depends(get_session)):
    return bike_service.create_bike(session, bike_in)

@router.get("/{bike_id}", response_model=BikeResponse)
def get_bike(bike_id: int, session: Session = Depends(get_session)):
    return bike_service.get_bike(session, bike_id)

@router.put("/{bike_id}", response_model=BikeResponse)
def update_bike(bike_id: int, bike_in: BikeUpdate, session: Session = Depends(get_session)):
    return bike_service.update_bike(session, bike_id, bike_in)

@router.delete("/{bike_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bike(bike_id: int, session: Session = Depends(get_session)):
    bike_service.delete_bike(session, bike_id)
    return None
