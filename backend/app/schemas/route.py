from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class RouteBase(BaseModel):
    name: str
    summary_polyline: Optional[str] = None

class RouteCreate(RouteBase):
    pass

class RouteUpdate(BaseModel):
    name: Optional[str] = None
    summary_polyline: Optional[str] = None

class RouteResponse(RouteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

class RouteMatchRequest(BaseModel):
    polyline: str
