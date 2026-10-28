import logging
import os
import subprocess
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session, text

from app.core.config import settings
from app.core.database import get_session
from app.schemas.internal import LogLevelRequest

router = APIRouter(prefix="/api/internal", tags=["internal"])

def verify_ai_token(x_ai_token: str = Header(None)):
    env_token = os.environ.get("INTERNAL_AI_TOKEN", settings.INTERNAL_AI_TOKEN)
    if not x_ai_token or x_ai_token != env_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized AI Agent Access"
        )
    return True

@router.post("/logger/level", dependencies=[Depends(verify_ai_token)])
def set_dynamic_log_level(payload: LogLevelRequest):
    target_level = payload.level.upper()
    numeric_level = getattr(logging, target_level, None)

    if numeric_level is None:
        raise HTTPException(status_code=400, detail=f"Invalid log level: {payload.level}")

    logging.getLogger().setLevel(numeric_level)

    logging.getLogger("app.core.logger").info(
        f"ログレベルが動的に変更されました: {target_level}",
        extra={"log_id": "system-dynamic-level-change"}
    )

    return {"status": "success", "current_level": target_level}

@router.get("/health")
def internal_health_check(session: Session = Depends(get_session)):
    try:
        session.exec(text("SELECT 1"))
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": {
                "connected": True,
                "engine": "sqlite",
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database health check failed: {str(e)}",
        )

@router.get("/litestream/status")
def litestream_status():
    bucket = getattr(settings, "GCS_LITESTREAM_BACKUP_BUCKET", "")
    if not bucket:
        return {
            "status": "disabled",
            "message": "GCS_LITESTREAM_BACKUP_BUCKET is not set.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    try:
        res = subprocess.run(
            ["litestream", "replications", "-config", "/etc/litestream.yml"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return {
            "status": "active" if res.returncode == 0 else "degraded",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "output": res.stdout.strip(),
        }
    except Exception as e:
        return {
            "status": "unknown",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e),
        }
