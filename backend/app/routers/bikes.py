from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.bike import Bike, BikeCreate, BikeUpdate
from app.models.activity import Activity

router = APIRouter(prefix="/api/bikes", tags=["bikes"])

@router.get("", response_model=List[Bike])
def list_bikes(session: Session = Depends(get_session)):
    return session.exec(select(Bike).order_by(Bike.created_at.desc())).all()

@router.post("", response_model=Bike, status_code=status.HTTP_201_CREATED)
def create_bike(bike_in: BikeCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Bike).where(Bike.bike_code == bike_in.bike_code)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bike code already exists")
    
    bike = Bike.model_validate(bike_in)
    session.add(bike)
    session.commit()
    session.refresh(bike)
    return bike

@router.get("/{bike_id}", response_model=Bike)
def get_bike(bike_id: int, session: Session = Depends(get_session)):
    bike = session.get(Bike, bike_id)
    if not bike:
        raise HTTPException(status_code=404, detail="Bike not found")
    return bike

@router.put("/{bike_id}", response_model=Bike)
def update_bike(bike_id: int, bike_in: BikeUpdate, session: Session = Depends(get_session)):
    bike = session.get(Bike, bike_id)
    if not bike:
        raise HTTPException(status_code=404, detail="Bike not found")
    
    bike_data = bike_in.model_dump(exclude_unset=True)
    for key, value in bike_data.items():
        setattr(bike, key, value)
    bike.updated_at = datetime.now()
    
    session.add(bike)
    session.commit()
    session.refresh(bike)
    return bike

@router.delete("/{bike_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bike(bike_id: int, session: Session = Depends(get_session)):
    bike = session.get(Bike, bike_id)
    if not bike:
        raise HTTPException(status_code=404, detail="Bike not found")
    
    # Check reference integrity with activities
    referenced_activity = session.exec(select(Activity).where(Activity.bike_id == bike_id)).first()
    if referenced_activity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete bike '{bike.name}' because it is referenced by existing activities."
        )
    
    session.delete(bike)
    session.commit()
    return None
