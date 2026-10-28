from datetime import datetime
from typing import List

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.activity import Activity
from app.models.bike import Bike
from app.schemas.bike import BikeCreate, BikeUpdate


def list_bikes(session: Session) -> List[Bike]:
    return session.exec(select(Bike).order_by(Bike.created_at.desc())).all()

def get_bike(session: Session, bike_id: int) -> Bike:
    bike = session.get(Bike, bike_id)
    if not bike:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bike not found")
    return bike

def create_bike(session: Session, bike_in: BikeCreate) -> Bike:
    existing = session.exec(select(Bike).where(Bike.bike_code == bike_in.bike_code)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bike code already exists")

    bike = Bike.model_validate(bike_in)
    session.add(bike)
    session.commit()
    session.refresh(bike)
    return bike

def update_bike(session: Session, bike_id: int, bike_in: BikeUpdate) -> Bike:
    bike = get_bike(session, bike_id)
    bike_data = bike_in.model_dump(exclude_unset=True)
    for key, value in bike_data.items():
        setattr(bike, key, value)
    bike.updated_at = datetime.now()

    session.add(bike)
    session.commit()
    session.refresh(bike)
    return bike

def delete_bike(session: Session, bike_id: int) -> None:
    bike = get_bike(session, bike_id)
    referenced_activity = session.exec(select(Activity).where(Activity.bike_id == bike_id)).first()
    if referenced_activity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete bike '{bike.name}' because it is referenced by existing activities."
        )
    session.delete(bike)
    session.commit()
