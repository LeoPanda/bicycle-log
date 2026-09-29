from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.stay_log import StayLog, StayLogCreate, StayLogUpdate, StayLogImage
from app.models.place import Place
from app.models.activity import Activity
from app.services.image_service import optimize_and_save_image

router = APIRouter(prefix="/api/stay-logs", tags=["stay-logs"])

@router.get("")
def list_stay_logs(session: Session = Depends(get_session)):
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

@router.post("", response_model=StayLog, status_code=status.HTTP_201_CREATED)
def create_stay_log(stay_in: StayLogCreate, session: Session = Depends(get_session)):
    stay_log = StayLog.model_validate(stay_in)
    session.add(stay_log)
    session.commit()
    session.refresh(stay_log)
    return stay_log

@router.get("/{stay_id}")
def get_stay_log(stay_id: int, session: Session = Depends(get_session)):
    stay = session.get(StayLog, stay_id)
    if not stay:
        raise HTTPException(status_code=404, detail="Stay log not found")
    
    place = session.get(Place, stay.place_id)
    act = session.get(Activity, stay.activity_id)
    images = session.exec(select(StayLogImage).where(StayLogImage.stay_log_id == stay_id).order_by(StayLogImage.display_order.asc())).all()
    
    s_dict = stay.model_dump()
    s_dict["place_name"] = place.name if place else ""
    s_dict["place"] = place
    s_dict["activity_name"] = act.name if act else ""
    s_dict["images"] = images
    return s_dict

from pydantic import BaseModel
from app.models.category import PlaceCategory

class UpdateStayLogPlaceSchema(BaseModel):
    place_id: str
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    category_name: Optional[str] = None

class StayLogImageUpdateSchema(BaseModel):
    comment: Optional[str] = None

@router.put("/{stay_id}", response_model=StayLog)
def update_stay_log(stay_id: int, stay_in: StayLogUpdate, session: Session = Depends(get_session)):
    stay = session.get(StayLog, stay_id)
    if not stay:
        raise HTTPException(status_code=404, detail="Stay log not found")
    
    stay_data = stay_in.model_dump(exclude_unset=True)
    for key, value in stay_data.items():
        setattr(stay, key, value)
    stay.updated_at = datetime.now()
    
    session.add(stay)
    session.commit()
    session.refresh(stay)
    return stay

@router.put("/{stay_id}/place")
def update_stay_log_place(
    stay_id: int,
    place_in: UpdateStayLogPlaceSchema,
    session: Session = Depends(get_session)
):
    stay = session.get(StayLog, stay_id)
    if not stay:
        raise HTTPException(status_code=404, detail="Stay log not found")
    
    # 1. Match category
    cat_name = place_in.category_name or "未分類"
    category = session.exec(select(PlaceCategory).where(PlaceCategory.name == cat_name)).first()
    if not category:
        category = session.exec(select(PlaceCategory).where(PlaceCategory.name == "未分類")).first()

    # 2. Get or Create/Update Place
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

    # 3. Update StayLog place_id
    stay.place_id = place.id
    stay.updated_at = datetime.now()
    session.add(stay)
    session.commit()
    session.refresh(stay)

    images = session.exec(select(StayLogImage).where(StayLogImage.stay_log_id == stay_id).order_by(StayLogImage.display_order.asc())).all()
    s_dict = stay.model_dump()
    s_dict["place_name"] = place.name
    s_dict["place_address"] = place.address or ""
    s_dict["latitude"] = place.latitude
    s_dict["longitude"] = place.longitude
    s_dict["place"] = place
    s_dict["images"] = images
    return s_dict


@router.post("/{stay_id}/images")
async def add_stay_log_image(
    stay_id: int,
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    comment: Optional[str] = Form(None),
    session: Session = Depends(get_session)
):
    stay = session.get(StayLog, stay_id)
    if not stay:
        raise HTTPException(status_code=404, detail="Stay log not found")
    
    final_url = ""
    if file:
        # File upload: Optimize to 700x700 center crop WebP 80%
        try:
            content = await file.read()
            final_url = optimize_and_save_image(content, file.filename or "image.jpg")
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"画像処理エラー: {str(e)}")
    elif image_url:
        # Direct Web URL link
        final_url = image_url
    else:
        raise HTTPException(status_code=400, detail="Either file upload or image_url must be provided")

    # Get max display_order
    existing_images = session.exec(select(StayLogImage).where(StayLogImage.stay_log_id == stay_id)).all()
    max_order = max([img.display_order for img in existing_images], default=0)

    image_rec = StayLogImage(
        stay_log_id=stay_id,
        image_url=final_url,
        comment=comment,
        display_order=max_order + 1
    )
    session.add(image_rec)
    session.commit()
    session.refresh(image_rec)
    return image_rec

@router.put("/images/{image_id}", response_model=StayLogImage)
def update_stay_log_image(
    image_id: int,
    image_in: StayLogImageUpdateSchema,
    session: Session = Depends(get_session)
):
    img = session.get(StayLogImage, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    img.comment = image_in.comment
    img.updated_at = datetime.now()
    session.add(img)
    session.commit()
    session.refresh(img)
    return img

@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stay_log_image(image_id: int, session: Session = Depends(get_session)):
    img = session.get(StayLogImage, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    session.delete(img)
    session.commit()
    return None
