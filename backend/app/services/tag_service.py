from typing import List

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.tag import Tag
from app.schemas.tag import TagCreate


def list_tags(session: Session) -> List[Tag]:
    return session.exec(select(Tag).order_by(Tag.name.asc())).all()

def create_tag(session: Session, tag_in: TagCreate) -> Tag:
    existing = session.exec(select(Tag).where(Tag.name == tag_in.name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tag already exists")

    tag = Tag.model_validate(tag_in)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return tag

def delete_tag(session: Session, tag_id: int) -> None:
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    session.delete(tag)
    session.commit()
