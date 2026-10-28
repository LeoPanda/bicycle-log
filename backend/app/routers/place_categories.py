from typing import List

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.database import get_session
from app.schemas.category import PlaceCategoryCreate, PlaceCategoryResponse, PlaceCategoryUpdate
from app.services import category_service

router = APIRouter(prefix="/api/place-categories", tags=["place-categories"])

@router.get("", response_model=List[PlaceCategoryResponse])
def list_categories(session: Session = Depends(get_session)):
    return category_service.list_categories(session)

@router.post("", response_model=PlaceCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(cat_in: PlaceCategoryCreate, session: Session = Depends(get_session)):
    return category_service.create_category(session, cat_in)

@router.get("/{category_id}", response_model=PlaceCategoryResponse)
def get_category(category_id: int, session: Session = Depends(get_session)):
    return category_service.get_category(session, category_id)

@router.put("/{category_id}", response_model=PlaceCategoryResponse)
def update_category(category_id: int, cat_in: PlaceCategoryUpdate, session: Session = Depends(get_session)):
    return category_service.update_category(session, category_id, cat_in)

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, session: Session = Depends(get_session)):
    category_service.delete_category(session, category_id)
    return None
