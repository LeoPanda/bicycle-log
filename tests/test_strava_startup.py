import os
import sys
import pytest
from unittest.mock import patch

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.services.strava_service import has_strava_credentials

def test_has_strava_credentials():
    with patch("app.services.strava_service.settings") as mock_settings:
        mock_settings.STRAVA_CLIENT_ID = "id"
        mock_settings.STRAVA_CLIENT_SECRET = "secret"
        mock_settings.STRAVA_REFRESH_TOKEN = "token"
        assert has_strava_credentials() is True

        mock_settings.STRAVA_CLIENT_ID = ""
        assert has_strava_credentials() is False
