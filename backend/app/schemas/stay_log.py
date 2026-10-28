from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class StayLogImageBase(BaseModel):
    image_url: str
    comment: Optional[str] = None
    display_order: int = 1

class StayLogImageCreate(StayLogImageBase):
    stay_log_id: int

class StayLogImageUpdate(BaseModel):
    comment: Optional[str] = None

class StayLogImageResponse(StayLogImageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stay_log_id: int
    created_at: datetime
    updated_at: datetime

class StayLogBase(BaseModel):
    activity_id: int
    place_id: str
    arrived_at: datetime
    left_at: datetime
    stay_duration_seconds: int
    stay_latitude: float
    stay_longitude: float
    notes: Optional[str] = None

class StayLogCreate(StayLogBase):
    pass

class StayLogUpdate(BaseModel):
    notes: Optional[str] = None

class StayLogResponse(StayLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    place_name: Optional[str] = None
    activity_name: Optional[str] = None
    images: List[StayLogImageResponse] = []

class UpdateStayLogPlaceRequest(BaseModel):
    place_id: str
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    category_name: Optional[str] = None
