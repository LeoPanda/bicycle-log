from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class StayLogImageBase(SQLModel):
    image_url: str = Field(nullable=False)
    comment: Optional[str] = Field(default=None)
    display_order: int = Field(default=1)

class StayLogImage(StayLogImageBase, table=True):
    __tablename__ = "stay_log_images"

    id: Optional[int] = Field(default=None, primary_key=True)
    stay_log_id: int = Field(foreign_key="stay_logs.id", nullable=False)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    stay_log: Optional["StayLog"] = Relationship(back_populates="images")

class StayLogImageCreate(StayLogImageBase):
    stay_log_id: int

class StayLogBase(SQLModel):
    activity_id: int = Field(foreign_key="activities.id", nullable=False)
    place_id: str = Field(foreign_key="places.id", nullable=False)
    arrived_at: datetime = Field(nullable=False)
    left_at: datetime = Field(nullable=False)
    stay_duration_seconds: int = Field(nullable=False)
    stay_latitude: float = Field(nullable=False)
    stay_longitude: float = Field(nullable=False)
    notes: Optional[str] = Field(default=None)

class StayLog(StayLogBase, table=True):
    __tablename__ = "stay_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    activity: Optional["Activity"] = Relationship(back_populates="stay_logs")
    place: Optional["Place"] = Relationship(back_populates="stay_logs")
    images: List[StayLogImage] = Relationship(back_populates="stay_log")

class StayLogCreate(StayLogBase):
    pass

class StayLogUpdate(SQLModel):
    notes: Optional[str] = None
