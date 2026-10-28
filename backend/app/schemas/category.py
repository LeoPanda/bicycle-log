from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class PlaceCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 100

class PlaceCategoryCreate(PlaceCategoryBase):
    pass

class PlaceCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None

class PlaceCategoryResponse(PlaceCategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
