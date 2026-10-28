from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.activity import Activity
from app.models.category import PlaceCategory
from app.models.place import Place
from app.models.stay_log import StayLog, StayLogImage
from app.schemas.stay_log import StayLogCreate, StayLogImageUpdate, StayLogUpdate, UpdateStayLogPlaceRequest


def list_stay_logs(session: Session) -> List[Dict[str, Any]]:
    stay_logs = session.exec(select(StayLog).order_by(StayLog.arrived_at.desc())).all()
    results = []
    for s in stay_logs:
        place = session.get(Place, s.place_id)
        act = session.get(Activity, s.activity_id)
        images = session.exec(select(StayLogImage).where(StayLogImage.stay_log_id == s.id)).all()
        s_dict = s.model_dump()
        s_dict["place_name"] = place.name if place else ""
        s_dict["activity_name"] = act.name if act else ""
        s_dict["images"] = images
        results.append(s_dict)
    return results

def get_stay_log(session: Session, stay_id: int) -> Dict[str, Any]:
    stay = session.get(StayLog, stay_id)
    if not stay:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stay log not found")

    place = session.get(Place, stay.place_id)
    act = session.get(Activity, stay.activity_id)
    images = session.exec(
        select(StayLogImage).where(StayLogImage.stay_log_id == stay_id).order_by(StayLogImage.display_order.asc())
    ).all()

    s_dict = stay.model_dump()
    s_dict["place_name"] = place.name if place else ""
    s_dict["place"] = place
    s_dict["activity_name"] = act.name if act else ""
    s_dict["images"] = images
    return s_dict

def create_stay_log(session: Session, stay_in: StayLogCreate) -> StayLog:
    stay_log = StayLog.model_validate(stay_in)
    session.add(stay_log)
    session.commit()
    session.refresh(stay_log)
    return stay_log

def update_stay_log(session: Session, stay_id: int, stay_in: StayLogUpdate) -> StayLog:
    stay = session.get(StayLog, stay_id)
    if not stay:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stay log not found")

    stay_data = stay_in.model_dump(exclude_unset=True)
    for key, value in stay_data.items():
        setattr(stay, key, value)
    stay.updated_at = datetime.now()

    session.add(stay)
    session.commit()
    session.refresh(stay)
    return stay

def update_stay_log_place(session: Session, stay_id: int, place_in: UpdateStayLogPlaceRequest) -> Dict[str, Any]:
    stay = session.get(StayLog, stay_id)
    if not stay:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stay log not found")

    cat_name = place_in.category_name or "未分類"
    category = session.exec(select(PlaceCategory).where(PlaceCategory.name == cat_name)).first()
    if not category:
        category = session.exec(select(PlaceCategory).where(PlaceCategory.name == "未分類")).first()

    place = session.get(Place, place_in.place_id)
    if not place:
        place = Place(
            id=place_in.place_id,
            name=place_in.name,
            address=place_in.address,
            latitude=place_in.latitude,
            longitude=place_in.longitude,
            category_id=category.id if category else None
        )
        session.add(place)
    else:
        place.name = place_in.name
        place.address = place_in.address
        place.latitude = place_in.latitude
        place.longitude = place_in.longitude
        if category:
            place.category_id = category.id
        place.updated_at = datetime.now()
        session.add(place)

    session.commit()
    session.refresh(place)

    stay.place_id = place.id
    stay.updated_at = datetime.now()
    session.add(stay)
    session.commit()
    session.refresh(stay)

    images = session.exec(
        select(StayLogImage).where(StayLogImage.stay_log_id == stay_id).order_by(StayLogImage.display_order.asc())
    ).all()
    s_dict = stay.model_dump()
    s_dict["place_name"] = place.name
    s_dict["place_address"] = place.address or ""
    s_dict["latitude"] = place.latitude
    s_dict["longitude"] = place.longitude
    s_dict["place"] = place
    s_dict["images"] = images
    return s_dict

def add_image_to_stay_log(
    session: Session,
    stay_id: int,
    image_url: str,
    comment: Optional[str] = None
) -> StayLogImage:
    stay = session.get(StayLog, stay_id)
    if not stay:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stay log not found")

    existing_images = session.exec(select(StayLogImage).where(StayLogImage.stay_log_id == stay_id)).all()
    max_order = max([img.display_order for img in existing_images], default=0)

    image_rec = StayLogImage(
        stay_log_id=stay_id,
        image_url=image_url,
        comment=comment,
        display_order=max_order + 1
    )
    session.add(image_rec)
    session.commit()
    session.refresh(image_rec)
    return image_rec

def update_stay_log_image(session: Session, image_id: int, image_in: StayLogImageUpdate) -> StayLogImage:
    img = session.get(StayLogImage, image_id)
    if not img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    img.comment = image_in.comment
    img.updated_at = datetime.now()
    session.add(img)
    session.commit()
    session.refresh(img)
    return img

def delete_stay_log_image(session: Session, image_id: int) -> None:
    img = session.get(StayLogImage, image_id)
    if not img:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    session.delete(img)
    session.commit()
