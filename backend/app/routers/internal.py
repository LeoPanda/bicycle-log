import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(prefix="/api")

class LogLevelRequest(BaseModel):
    level: str  # DEBUG, INFO, WARNING, ERROR, CRITICAL

def verify_ai_token(x_ai_token: str = Header(None)):
    env_token = os.environ.get("INTERNAL_AI_TOKEN", settings.INTERNAL_AI_TOKEN)
    if not x_ai_token or x_ai_token != env_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized AI Agent Access"
        )
    return True

@router.post("/internal/logger/level", dependencies=[Depends(verify_ai_token)])
def set_dynamic_log_level(payload: LogLevelRequest):
    target_level = payload.level.upper()
    numeric_level = getattr(logging, target_level, None)

    if numeric_level is None:
        raise HTTPException(status_code=400, detail=f"Invalid log level: {payload.level}")

    # オンメモリでルートロガーのレベルを動的に書き換え
    logging.getLogger().setLevel(numeric_level)

    # 設定が変更されたことを明示するためにINFOログを出力
    logging.getLogger("app.core.logger").info(
        f"ログレベルが動的に変更されました: {target_level}",
        extra={"log_id": "system-dynamic-level-change"}
    )

    return {"status": "success", "current_level": target_level}
