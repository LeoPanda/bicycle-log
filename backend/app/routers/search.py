from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select, or_

from app.core.database import get_session
from app.models.place import Place
from app.models.category import PlaceCategory
from app.models.route import Route
from app.models.stay_log import StayLog

router = APIRouter(prefix="/api/search", tags=["Search"])

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

@router.get("", response_model=SearchResponse)
def search_spots_and_routes(
    q: str = Query("", description="検索キーワード"),
    session: Session = Depends(get_session)
):
    keyword = q.strip()
    if not keyword:
        return SearchResponse(places=[], routes=[])

    search_pattern = f"%{keyword}%"

    # 1. 滞在スポットの検索 (Place.name, address, comment, もしくはカテゴリ名)
    matched_cat_ids = session.exec(
        select(PlaceCategory.id).where(PlaceCategory.name.like(search_pattern))
    ).all()

    place_query = select(Place).where(
        or_(
            Place.name.like(search_pattern),
            Place.address.like(search_pattern),
            Place.comment.like(search_pattern),
            Place.category_id.in_(matched_cat_ids) if matched_cat_ids else False
        )
    ).limit(10)

    found_places = session.exec(place_query).all()
    place_results = []
    for p in found_places:
        visit_count = len(p.stay_logs) if p.stay_logs else 0
        cat_name = p.category.name if p.category else "その他"
        cat_icon = p.category.icon if p.category else "map-pin"
        place_results.append(PlaceSearchResult(
            id=p.id,
            name=p.name,
            category_name=cat_name,
            category_icon=cat_icon,
            address=p.address,
            visit_count=visit_count
        ))

    # 2. 定番ルートの検索 (Route.name)
    route_query = select(Route).where(Route.name.like(search_pattern)).limit(10)
    found_routes = session.exec(route_query).all()
    route_results = []
    for r in found_routes:
        act_count = len(r.activities) if r.activities else 0
        route_results.append(RouteSearchResult(
            id=r.id,
            name=r.name,
            activity_count=act_count
        ))

    return SearchResponse(places=place_results, routes=route_results)
