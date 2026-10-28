from typing import List
from fastapi import APIRouter, Depends, status
from sqlmodel import Session
from app.core.database import get_session
from app.schemas.tag import TagCreate, TagResponse
from app.services import tag_service

router = APIRouter(prefix="/api/tags", tags=["tags"])

@router.get("", response_model=List[TagResponse])
def list_tags(session: Session = Depends(get_session)):
    return tag_service.list_tags(session)

@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(tag_in: TagCreate, session: Session = Depends(get_session)):
    return tag_service.create_tag(session, tag_in)

@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, session: Session = Depends(get_session)):
    tag_service.delete_tag(session, tag_id)
    return None
