import os
import sys
import pytest

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.services.polyline_utils import (
    decode_polyline,
    haversine_distance,
    resample_points,
    calculate_fast_similarity,
)

def test_decode_polyline():
    # Simple encoded line
    # (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
    encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
    pts = decode_polyline(encoded)
    assert len(pts) == 3
    assert pytest.approx(pts[0][0], rel=1e-3) == 38.5
    assert pytest.approx(pts[0][1], rel=1e-3) == -120.2

def test_haversine_distance():
    # Tokyo to Osaka is roughly 400km
    tokyo = (35.6812, 139.7671)
    osaka = (34.6937, 135.5023)
    dist = haversine_distance(tokyo, osaka)
    assert 390000 < dist < 410000

def test_calculate_fast_similarity_identical():
    pts = [(35.0 + i * 0.001, 135.0 + i * 0.001) for i in range(10)]
    sim = calculate_fast_similarity(pts, pts)
    assert sim == 1.0

def test_calculate_fast_similarity_different():
    pts1 = [(35.0 + i * 0.001, 135.0 + i * 0.001) for i in range(10)]
    pts2 = [(36.0 + i * 0.001, 136.0 + i * 0.001) for i in range(10)]
    sim = calculate_fast_similarity(pts1, pts2)
    assert sim == 0.0
