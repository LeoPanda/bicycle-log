from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class BikeBase(BaseModel):
    bike_code: str
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    registered_at: Optional[datetime] = None
    notes: Optional[str] = None
    strava_gear_id: Optional[str] = None

class BikeCreate(BikeBase):
    pass

class BikeUpdate(BaseModel):
    bike_code: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    registered_at: Optional[datetime] = None
    notes: Optional[str] = None
    strava_gear_id: Optional[str] = None

class BikeResponse(BikeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
