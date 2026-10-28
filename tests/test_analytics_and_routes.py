import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.main import app
from app.services.polyline_utils import (
    calculate_fast_similarity,
    decode_polyline,
    haversine_distance,
    resample_points,
)

client = TestClient(app)

# -------------------------------------------------------------------
# [REQ-F05] 定番ルート高速類似度アルゴリズムのテスト (正常系・異常系・境界値)
# -------------------------------------------------------------------
def test_polyline_similarity_identical_route():
    """同一ルートの類似度は1.0となること"""
    line = [(35.0 + i * 0.001, 135.0 + i * 0.001) for i in range(20)]
    sim = calculate_fast_similarity(line, line, distance_threshold_m=150.0, min_similarity=0.70)
    assert sim == 1.0


def test_polyline_similarity_completely_different_route():
    """全く異なるルートは早期脱出で0.0となること"""
    line1 = [(35.0 + i * 0.001, 135.0 + i * 0.001) for i in range(20)]
    line2 = [(36.0 + i * 0.001, 136.0 + i * 0.001) for i in range(20)]
    sim = calculate_fast_similarity(line1, line2, distance_threshold_m=150.0, min_similarity=0.70)
    assert sim == 0.0


def test_polyline_similarity_empty_or_single_point():
    """空または単一ポイントの境界値テスト"""
    assert calculate_fast_similarity([], []) == 0.0
    assert calculate_fast_similarity([(35.0, 135.0)], []) == 0.0
    assert calculate_fast_similarity([], [(35.0, 135.0)]) == 0.0


def test_polyline_resample_points():
    """間引き点列サンプリングが正しく等間隔化されること"""
    raw_pts = [(35.0 + i * 0.001, 135.0) for i in range(50)]
    resampled = resample_points(raw_pts, sample_interval_m=200.0)
    assert len(resampled) < len(raw_pts)
    assert resampled[0] == raw_pts[0]
    assert resampled[-1] == raw_pts[-1]


# -------------------------------------------------------------------
# [REQ-F06] アナリティクスAPIテスト
# -------------------------------------------------------------------
def test_analytics_metrics_api_structure():
    """GET /api/analytics/metrics が5大メトリクス指標を含むこと"""
    res = client.get("/api/analytics/metrics?range_type=annual")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert isinstance(data["metrics"], list)

    if len(data["metrics"]) > 0:
        first = data["metrics"][0]
        assert "period" in first
        assert "distance_km" in first
        assert "elevation_m" in first
        assert "moving_hours" in first
        assert "ride_count" in first
        assert "calories_kcal" in first


def test_analytics_heatmap_api_structure():
    """GET /api/analytics/heatmap がヒートマップ・スポット・定番ルートを含むこと"""
    res = client.get("/api/analytics/heatmap?year=all")
    assert res.status_code == 200
    data = res.json()
    assert "polylines" in data
    assert "routes" in data
    assert "markers" in data
    assert isinstance(data["polylines"], list)
    assert isinstance(data["routes"], list)
    assert isinstance(data["markers"], list)


def test_routes_list_api_structure():
    """GET /api/routes が定番ルート一覧を返却すること"""
    res = client.get("/api/routes")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        route = data[0]
        assert "id" in route
        assert "name" in route
        assert "activity_count" in route
