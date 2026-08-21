from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class ActivityTag(SQLModel, table=True):
    __tablename__ = "activity_tags"

    activity_id: int = Field(foreign_key="activities.id", primary_key=True)
    tag_id: int = Field(foreign_key="tags.id", primary_key=True)

class PlaceTag(SQLModel, table=True):
    __tablename__ = "place_tags"

    place_id: str = Field(foreign_key="places.id", primary_key=True)
    tag_id: int = Field(foreign_key="tags.id", primary_key=True)

class TagBase(SQLModel):
    name: str = Field(unique=True, index=True, nullable=False)

class Tag(TagBase, table=True):
    __tablename__ = "tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)

class TagCreate(TagBase):
    pass
