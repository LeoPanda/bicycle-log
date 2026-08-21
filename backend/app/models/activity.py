from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class ActivityBase(SQLModel):
    name: str = Field(nullable=False)
    bike_id: Optional[int] = Field(default=None, foreign_key="bikes.id")
    start_date: datetime = Field(nullable=False)
    distance: float = Field(default=0.0)
    moving_time: Optional[int] = Field(default=None)
    elapsed_time: Optional[int] = Field(default=None)
    total_elevation_gain: float = Field(default=0.0)
    calories: Optional[float] = Field(default=None)
    summary_polyline: Optional[str] = Field(default=None)

class Activity(ActivityBase, table=True):
    __tablename__ = "activities"

    id: int = Field(primary_key=True)  # Strava Activity ID
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    bike: Optional["Bike"] = Relationship(back_populates="activities")
    stay_logs: List["StayLog"] = Relationship(back_populates="activity")

class ActivityCreate(ActivityBase):
    id: int

class ActivityUpdate(SQLModel):
    name: Optional[str] = None
    bike_id: Optional[int] = None
    start_date: Optional[datetime] = None
    distance: Optional[float] = None
    moving_time: Optional[int] = None
    elapsed_time: Optional[int] = None
    total_elevation_gain: Optional[float] = None
    calories: Optional[float] = None
    summary_polyline: Optional[str] = None
