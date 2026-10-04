from typing import Optional, List
from datetime import datetime
from pydantic import NaiveDatetime
from sqlmodel import SQLModel, Field, Relationship

class RouteBase(SQLModel):
    name: str = Field(nullable=False)
    summary_polyline: Optional[str] = Field(default=None)

class Route(RouteBase, table=True):
    __tablename__ = "routes"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    updated_at: NaiveDatetime = Field(default_factory=datetime.now)

    activities: List["Activity"] = Relationship(back_populates="route")

class RouteCreate(RouteBase):
    pass

class RouteUpdate(SQLModel):
    name: Optional[str] = None
    summary_polyline: Optional[str] = None
