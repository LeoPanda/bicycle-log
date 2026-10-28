from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.database import get_session
from app.schemas.search import SearchResponse
from app.services import search_service

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.get("", response_model=SearchResponse)
def search_spots_and_routes(
    q: str = Query("", description="検索キーワード"),
    session: Session = Depends(get_session)
):
    return search_service.search_spots_and_routes_data(session=session, q=q)
