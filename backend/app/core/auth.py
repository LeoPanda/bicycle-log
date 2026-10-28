import logging
from typing import Optional
from fastapi import Header, HTTPException, status
from google.auth.transport import requests
from google.oauth2 import id_token
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger("app.core.auth")

class AuthenticatedUser(BaseModel):
    user_id: str
    email: str

def get_current_user(
    x_goog_iap_jwt_assertion: Optional[str] = Header(None, alias="X-Goog-IAP-JWT-Assertion")
) -> AuthenticatedUser:
    """
    Validates Google Cloud IAP JWT assertion header.
    Allows local development bypass if DEBUG=True and ALLOW_LOCAL_AUTH_BYPASS=True.
    In production, enforces strict signature and audience verification.
    """
    if settings.DEBUG and settings.ALLOW_LOCAL_AUTH_BYPASS:
        return AuthenticatedUser(
            user_id="local-dev-user-001",
            email="dev@example.com"
        )

    if not x_goog_iap_jwt_assertion:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required IAP JWT assertion header."
        )

    try:
        payload = id_token.verify_token(
            x_goog_iap_jwt_assertion,
            requests.Request(),
            audience=settings.IAP_AUDIENCE
        )
        return AuthenticatedUser(
            user_id=payload.get("sub", ""),
            email=payload.get("email", "")
        )
    except Exception as e:
        logger.error(f"IAP JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid IAP JWT assertion: {str(e)}"
        )
