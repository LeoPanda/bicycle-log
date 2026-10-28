from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ActivityBase(BaseModel):
    name: str
    bike_id: Optional[int] = None
    start_date: datetime
    distance: float = 0.0
    moving_time: Optional[int] = None
    elapsed_time: Optional[int] = None
    total_elevation_gain: float = 0.0
    calories: Optional[float] = None
    summary_polyline: Optional[str] = None
    route_id: Optional[int] = None

class ActivityCreate(ActivityBase):
    id: int

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    bike_id: Optional[int] = None
    start_date: Optional[datetime] = None
    distance: Optional[float] = None
    moving_time: Optional[int] = None
    elapsed_time: Optional[int] = None
    total_elevation_gain: Optional[float] = None
    calories: Optional[float] = None
    summary_polyline: Optional[str] = None
    route_id: Optional[int] = None

class ActivityResponse(ActivityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

class ActivityListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    bike_id: Optional[int] = None
    bike_name: Optional[str] = None
    start_date: datetime
    distance: float
    moving_time: Optional[int] = None
    elapsed_time: Optional[int] = None
    total_elevation_gain: float
    calories: Optional[float] = None
    summary_polyline: Optional[str] = None
    route_id: Optional[int] = None
    stay_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ActivityListResponse(BaseModel):
    items: List[ActivityListItem]
    total: int
    page: int
    per_page: int
    total_pages: int

class ActivitySyncRequest(BaseModel):
    after_timestamp: Optional[int] = None
    force_all: bool = False
