from typing import Optional, List
from datetime import datetime
from pydantic import NaiveDatetime
from sqlmodel import SQLModel, Field, Relationship

class BikeBase(SQLModel):
    bike_code: str = Field(unique=True, index=True, nullable=False)
    name: str = Field(nullable=False)
    brand: Optional[str] = Field(default=None)
    model: Optional[str] = Field(default=None)
    registered_at: Optional[NaiveDatetime] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    strava_gear_id: Optional[str] = Field(default=None, index=True)

class Bike(BikeBase, table=True):
    __tablename__ = "bikes"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    updated_at: NaiveDatetime = Field(default_factory=datetime.now)

    activities: List["Activity"] = Relationship(back_populates="bike")

class BikeCreate(BikeBase):
    pass

class BikeUpdate(SQLModel):
    bike_code: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    registered_at: Optional[NaiveDatetime] = None
    notes: Optional[str] = None
    strava_gear_id: Optional[str] = None
