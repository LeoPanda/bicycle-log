import logging
import httpx
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger("app.services.strava_client")

def has_strava_credentials() -> bool:
    return bool(settings.STRAVA_CLIENT_ID and settings.STRAVA_CLIENT_SECRET and settings.STRAVA_REFRESH_TOKEN)

def get_strava_access_token(client: httpx.Client) -> str:
    token_url = "https://www.strava.com/oauth/token"
    token_params = {
        "client_id": settings.STRAVA_CLIENT_ID,
        "client_secret": settings.STRAVA_CLIENT_SECRET,
        "refresh_token": settings.STRAVA_REFRESH_TOKEN,
        "grant_type": "refresh_token"
    }
    t_res = client.post(token_url, data=token_params)
    if t_res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Strava OAuth Token Exchange failed: {t_res.status_code} - {t_res.text}"
        )
    return t_res.json()["access_token"]

def fetch_athlete_activities(
    client: httpx.Client,
    access_token: str,
    after_timestamp: int = 0,
    before_timestamp: Optional[int] = None
) -> List[Dict[str, Any]]:
    acts_url = "https://www.strava.com/api/v3/athlete/activities"
    headers = {"Authorization": f"Bearer {access_token}"}
    real_activities = []
    page = 1
    per_page = 100

    while True:
        params = {"per_page": per_page, "page": page}
        if after_timestamp > 0:
            params["after"] = after_timestamp
        if before_timestamp and before_timestamp > 0:
            params["before"] = before_timestamp

        a_res = client.get(acts_url, headers=headers, params=params)
        if a_res.status_code != 200:
            err_detail = a_res.json().get("message", a_res.text) if a_res.headers.get("content-type", "").startswith("application/json") else a_res.text
            raise HTTPException(
                status_code=a_res.status_code,
                detail=f"Strava Activities API error ({a_res.status_code}): {err_detail}. Note: Ensure your STRAVA_REFRESH_TOKEN in .env has 'activity:read_all' or 'activity:read' scope."
            )

        page_activities = a_res.json()
        if not isinstance(page_activities, list) or len(page_activities) == 0:
            break

        real_activities.extend(page_activities)
        if len(page_activities) < per_page:
            break
        page += 1

    return real_activities

def fetch_strava_streams(client: httpx.Client, access_token: str, activity_id: int) -> Dict[str, Any]:
    url = f"https://www.strava.com/api/v3/activities/{activity_id}/streams"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"keys": "latlng,time,moving", "key_by_type": "true"}
    try:
        res = client.get(url, headers=headers, params=params)
        if res.status_code == 200:
            data = res.json()
            if isinstance(data, dict):
                return data
            elif isinstance(data, list):
                result = {}
                for item in data:
                    if isinstance(item, dict) and "type" in item:
                        result[item["type"]] = item
                return result
    except Exception as e:
        logger.warning(f"Failed to fetch Strava streams for activity {activity_id}: {e}")
    return {}

def fetch_strava_gear(client: httpx.Client, access_token: str, gear_id: str) -> Optional[Dict[str, Any]]:
    url = f"https://www.strava.com/api/v3/gear/{gear_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        res = client.get(url, headers=headers)
        if res.status_code == 200:
            return res.json()
        logger.warning(f"Strava Gear API returned status {res.status_code} for gear_id {gear_id}: {res.text}")
    except Exception as e:
        logger.warning(f"Failed to fetch Strava gear {gear_id}: {e}")
    return None

def fetch_strava_activity_detail(client: httpx.Client, access_token: str, activity_id: int) -> Optional[Dict[str, Any]]:
    url = f"https://www.strava.com/api/v3/activities/{activity_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        res = client.get(url, headers=headers)
        if res.status_code == 200:
            return res.json()
        logger.warning(f"Strava Activity Detail API returned status {res.status_code} for activity {activity_id}: {res.text}")
    except Exception as e:
        logger.warning(f"Failed to fetch Strava activity detail for {activity_id}: {e}")
    return None
