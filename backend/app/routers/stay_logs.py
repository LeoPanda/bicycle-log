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
        final_url = optimize_and_save_image(file.file, file.filename or "image.jpg")
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

@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stay_log_image(image_id: int, session: Session = Depends(get_session)):
    img = session.get(StayLogImage, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    session.delete(img)
    session.commit()
    return None
