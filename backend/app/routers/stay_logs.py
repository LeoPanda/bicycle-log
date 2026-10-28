from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session

from app.core.database import get_session
from app.schemas.stay_log import (
    StayLogCreate,
    StayLogImageResponse,
    StayLogImageUpdate,
    StayLogResponse,
    StayLogUpdate,
    UpdateStayLogPlaceRequest,
)
from app.services import stay_log_service
from app.services.image_service import optimize_and_save_image

router = APIRouter(prefix="/api/stay-logs", tags=["stay-logs"])

@router.get("")
def list_stay_logs(session: Session = Depends(get_session)):
    return stay_log_service.list_stay_logs(session=session)

@router.post("", response_model=StayLogResponse, status_code=status.HTTP_201_CREATED)
def create_stay_log(stay_in: StayLogCreate, session: Session = Depends(get_session)):
    return stay_log_service.create_stay_log(session=session, stay_in=stay_in)

@router.get("/{stay_id}")
def get_stay_log(stay_id: int, session: Session = Depends(get_session)):
    return stay_log_service.get_stay_log(session=session, stay_id=stay_id)

@router.put("/{stay_id}", response_model=StayLogResponse)
def update_stay_log(stay_id: int, stay_in: StayLogUpdate, session: Session = Depends(get_session)):
    return stay_log_service.update_stay_log(session=session, stay_id=stay_id, stay_in=stay_in)

@router.put("/{stay_id}/place")
def update_stay_log_place(
    stay_id: int,
    place_in: UpdateStayLogPlaceRequest,
    session: Session = Depends(get_session)
):
    return stay_log_service.update_stay_log_place(session=session, stay_id=stay_id, place_in=place_in)

@router.post("/{stay_id}/images", response_model=StayLogImageResponse)
async def add_stay_log_image(
    stay_id: int,
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    comment: Optional[str] = Form(None),
    session: Session = Depends(get_session)
):
    final_url = ""
    if file:
        try:
            content = await file.read()
            final_url = optimize_and_save_image(content, file.filename or "image.jpg")
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"画像処理エラー: {str(e)}")
    elif image_url:
        final_url = image_url
    else:
        raise HTTPException(status_code=400, detail="Either file upload or image_url must be provided")

    return stay_log_service.add_image_to_stay_log(
        session=session,
        stay_id=stay_id,
        image_url=final_url,
        comment=comment
    )

@router.put("/images/{image_id}", response_model=StayLogImageResponse)
def update_stay_log_image(
    image_id: int,
    image_in: StayLogImageUpdate,
    session: Session = Depends(get_session)
):
    return stay_log_service.update_stay_log_image(session=session, image_id=image_id, image_in=image_in)

@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stay_log_image(image_id: int, session: Session = Depends(get_session)):
    stay_log_service.delete_stay_log_image(session=session, image_id=image_id)
    return None
