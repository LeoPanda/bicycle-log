from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.tag import Tag, TagCreate

router = APIRouter(prefix="/api/tags", tags=["tags"])

@router.get("", response_model=List[Tag])
def list_tags(session: Session = Depends(get_session)):
    return session.exec(select(Tag).order_by(Tag.name.asc())).all()

@router.post("", response_model=Tag, status_code=status.HTTP_201_CREATED)
def create_tag(tag_in: TagCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Tag).where(Tag.name == tag_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")
    
    tag = Tag.model_validate(tag_in)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return tag

@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    session.delete(tag)
    session.commit()
    return None
