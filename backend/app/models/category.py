from typing import Optional, List
from datetime import datetime
from pydantic import NaiveDatetime
from sqlmodel import SQLModel, Field, Relationship

class PlaceCategoryBase(SQLModel):
    name: str = Field(unique=True, index=True, nullable=False)
    description: Optional[str] = Field(default=None)
    icon: Optional[str] = Field(default=None)
    sort_order: int = Field(default=100, index=True)

class PlaceCategory(PlaceCategoryBase, table=True):
    __tablename__ = "place_categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    updated_at: NaiveDatetime = Field(default_factory=datetime.now)

    places: List["Place"] = Relationship(back_populates="category")

class PlaceCategoryCreate(PlaceCategoryBase):
    pass

class PlaceCategoryUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
