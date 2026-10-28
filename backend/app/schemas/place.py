from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class PlaceBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    address: Optional[str] = None
    latitude: float
    longitude: float
    comment: Optional[str] = None

class PlaceCreate(PlaceBase):
    id: str

class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    comment: Optional[str] = None

class PlaceResponse(PlaceBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime

class PlaceListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    address: Optional[str] = None
    latitude: float
    longitude: float
    comment: Optional[str] = None
    visit_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PlaceListResponse(BaseModel):
    items: List[PlaceListItem]
    total: int
    page: int
    per_page: int
    total_pages: int

class OverwritePlaceRequest(BaseModel):
    new_place_id: str
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    category_name: Optional[str] = None

class PlaceSearchQuery(BaseModel):
    lat: float
    lng: float
    radius: float = 2000.0
    q: Optional[str] = None
