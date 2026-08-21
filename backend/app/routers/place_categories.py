from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.category import PlaceCategory, PlaceCategoryCreate, PlaceCategoryUpdate
from app.models.place import Place

router = APIRouter(prefix="/api/place-categories", tags=["place-categories"])

@router.get("", response_model=List[PlaceCategory])
def list_categories(session: Session = Depends(get_session)):
    return session.exec(select(PlaceCategory).order_by(PlaceCategory.id.asc())).all()

@router.post("", response_model=PlaceCategory, status_code=status.HTTP_201_CREATED)
def create_category(cat_in: PlaceCategoryCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(PlaceCategory).where(PlaceCategory.name == cat_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    category = PlaceCategory.model_validate(cat_in)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category

@router.get("/{category_id}", response_model=PlaceCategory)
def get_category(category_id: int, session: Session = Depends(get_session)):
    cat = session.get(PlaceCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat

@router.put("/{category_id}", response_model=PlaceCategory)
def update_category(category_id: int, cat_in: PlaceCategoryUpdate, session: Session = Depends(get_session)):
    cat = session.get(PlaceCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    cat_data = cat_in.model_dump(exclude_unset=True)
    for key, value in cat_data.items():
        setattr(cat, key, value)
    cat.updated_at = datetime.now()
    
    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, session: Session = Depends(get_session)):
    cat = session.get(PlaceCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check reference integrity with places
    referenced_place = session.exec(select(Place).where(Place.category_id == category_id)).first()
    if referenced_place:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete category '{cat.name}' because it is referenced by existing places."
        )
    
    session.delete(cat)
    session.commit()
    return None
