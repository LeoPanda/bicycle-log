from datetime import datetime
from typing import List

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.category import PlaceCategory
from app.models.place import Place
from app.schemas.category import PlaceCategoryCreate, PlaceCategoryUpdate


def list_categories(session: Session) -> List[PlaceCategory]:
    return session.exec(select(PlaceCategory).order_by(PlaceCategory.sort_order.asc(), PlaceCategory.id.asc())).all()

def get_category(session: Session, category_id: int) -> PlaceCategory:
    cat = session.get(PlaceCategory, category_id)
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return cat

def create_category(session: Session, cat_in: PlaceCategoryCreate) -> PlaceCategory:
    existing = session.exec(select(PlaceCategory).where(PlaceCategory.name == cat_in.name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category name already exists")

    category = PlaceCategory.model_validate(cat_in)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category

def update_category(session: Session, category_id: int, cat_in: PlaceCategoryUpdate) -> PlaceCategory:
    cat = get_category(session, category_id)
    cat_data = cat_in.model_dump(exclude_unset=True)
    for key, value in cat_data.items():
        setattr(cat, key, value)
    cat.updated_at = datetime.now()

    session.add(cat)
    session.commit()
    session.refresh(cat)
    return cat

def delete_category(session: Session, category_id: int) -> None:
    cat = get_category(session, category_id)
    referenced_place = session.exec(select(Place).where(Place.category_id == category_id)).first()
    if referenced_place:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete category '{cat.name}' because it is referenced by existing places."
        )
    session.delete(cat)
    session.commit()

def seed_initial_categories(session: Session) -> None:
    default_categories = [
        ("宿泊施設", "ホテル・旅館・ゲストハウス等", "hotel", 10),
        ("カフェ", "カフェ・喫茶店・ベーカリー", "coffee", 20),
        ("レストラン", "レストラン・飲食店・食堂", "utensils", 30),
        ("コンビニ", "コンビニエンスストア・スーパー", "store", 40),
        ("公園", "公園・緑地・キャンプ場", "trees", 50),
        ("映画館", "映画館・シネマ", "film", 60),
        ("博物館・美術館", "博物館・美術館・文化施設", "landmark", 70),
        ("寺社・仏閣", "神社・寺院・教会", "church", 80),
        ("駅", "鉄道駅・バスターミナル", "train", 90),
        ("休憩スポット", "道の駅・休憩所・案内所", "coffee", 100),
        ("その他", "その他の施設・未分類", "map-pin", 110),
    ]

    existing_cats = {c.name: c for c in session.exec(select(PlaceCategory)).all()}

    rename_map = {
        "寺社仏閣": "寺社・仏閣",
        "博物館": "博物館・美術館",
        "道の駅": "休憩スポット",
        "温泉": "休憩スポット",
    }
    for old_name, new_name in rename_map.items():
        if old_name in existing_cats and new_name not in existing_cats:
            cat = existing_cats[old_name]
            cat.name = new_name
            session.add(cat)
            session.commit()
            session.refresh(cat)
            existing_cats[new_name] = cat
            del existing_cats[old_name]

    for name, desc, icon, sort_order in default_categories:
        if name not in existing_cats:
            cat = PlaceCategory(name=name, description=desc, icon=icon, sort_order=sort_order)
            session.add(cat)
        else:
            cat = existing_cats[name]
            if getattr(cat, "sort_order", None) is None or cat.sort_order == 100:
                cat.sort_order = sort_order
                session.add(cat)
    session.commit()

