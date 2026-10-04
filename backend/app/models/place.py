from typing import Optional, List
from datetime import datetime
from pydantic import NaiveDatetime
from sqlmodel import SQLModel, Field, Relationship

class PlaceBase(SQLModel):
    name: str = Field(nullable=False)
    category_id: Optional[int] = Field(default=None, foreign_key="place_categories.id")
    address: Optional[str] = Field(default=None)
    latitude: float = Field(nullable=False)
    longitude: float = Field(nullable=False)
    comment: Optional[str] = Field(default=None)

class Place(PlaceBase, table=True):
    __tablename__ = "places"

    id: str = Field(primary_key=True)  # Google Place ID or custom UUID
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    updated_at: NaiveDatetime = Field(default_factory=datetime.now)

    category: Optional["PlaceCategory"] = Relationship(back_populates="places")
    stay_logs: List["StayLog"] = Relationship(back_populates="place")

class PlaceCreate(PlaceBase):
    id: str

class PlaceUpdate(SQLModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    comment: Optional[str] = None
