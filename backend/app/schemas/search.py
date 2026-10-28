from typing import List, Optional

from pydantic import BaseModel


class PlaceSearchResult(BaseModel):
    id: str
    name: str
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    address: Optional[str] = None
    visit_count: int = 0

class RouteSearchResult(BaseModel):
    id: int
    name: str
    activity_count: int = 0

class SearchResponse(BaseModel):
    places: List[PlaceSearchResult]
    routes: List[RouteSearchResult]
