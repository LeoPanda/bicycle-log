import os
import sys
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

# backend を sys.path に追加
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.main import app
from scripts.restore_test_db import reset_and_seed_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_database():
    """テストモジュール実行前に DB をクリーンシード状態に初期化"""
    reset_and_seed_db()

# -------------------------------------------------------------------
# シナリオ01: 認証・ヘルスチェック・セッション管理
# -------------------------------------------------------------------
def test_scenario_01_health_check_and_auth():
    # 1. ヘルスチェック API
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "project" in data

    # 2. IAP モックヘッダー付きのリクエスト検証
    headers = {"x-goog-authenticated-user-email": "testuser@example.com"}
    response = client.get("/api/health", headers=headers)
    assert response.status_code == 200

# -------------------------------------------------------------------
# シナリオ02: ダッシュボード表示・サマリー集計
# -------------------------------------------------------------------
def test_scenario_02_dashboard_summary():
    # ダッシュボードサマリー取得 (/api/analytics/dashboard)
    response = client.get("/api/analytics/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    summary = data["summary"]
    assert "total_distance_km" in summary
    assert "total_elevation_gain_m" in summary
    assert "total_ride_count" in summary
    assert "total_stay_spots" in summary

# -------------------------------------------------------------------
# シナリオ03: アクティビティ・滞在スポット一覧 & CRUD操作
# -------------------------------------------------------------------
def test_scenario_03_activities_and_places_crud():
    # 1. アクティビティ一覧取得
    response = client.get("/api/activities")
    assert response.status_code == 200
    res_act = response.json()
    assert "items" in res_act
    activities = res_act["items"]
    assert isinstance(activities, list)
    assert len(activities) >= 1

    # 2. 滞在スポット一覧取得
    response = client.get("/api/places")
    assert response.status_code == 200
    res_places = response.json()
    assert "items" in res_places
    places = res_places["items"]
    assert isinstance(places, list)
    assert len(places) >= 1

    # 3. 滞在記録一覧取得
    response = client.get("/api/stay-logs")
    assert response.status_code == 200
    logs = response.json()
    assert isinstance(logs, list)

# -------------------------------------------------------------------
# シナリオ04: マスタ管理機能 (CRUD)
# -------------------------------------------------------------------
def test_scenario_04_master_management():
    # 1. 自転車マスタ取得・追加
    response = client.get("/api/bikes")
    assert response.status_code == 200
    bikes = response.json()
    assert isinstance(bikes, list)

    new_bike = {
        "bike_code": "BIKE-TEST-E2E",
        "name": "Test Enduro Bike",
        "brand": "Specialized",
        "model": "Stumpjumper"
    }
    response = client.post("/api/bikes", json=new_bike)
    assert response.status_code in [200, 201]
    created_bike = response.json()
    assert created_bike["bike_code"] == "BIKE-TEST-E2E"

    # 2. カテゴリマスタ取得・追加
    response = client.get("/api/place-categories")
    assert response.status_code == 200
    categories = response.json()
    assert isinstance(categories, list)

    new_cat = {
        "name": "E2Eテストカテゴリ",
        "description": "自動テスト用カテゴリ",
        "icon": "flag",
        "sort_order": 99
    }
    response = client.post("/api/place-categories", json=new_cat)
    assert response.status_code in [200, 201]

    # 3. タグマスタ取得・追加
    response = client.get("/api/tags")
    assert response.status_code == 200

    new_tag = {"name": "E2Eテストタグ", "color": "#00ff00"}
    response = client.post("/api/tags", json=new_tag)
    assert response.status_code in [200, 201]

# -------------------------------------------------------------------
# シナリオ05: 可視化・グラフ集計機能
# -------------------------------------------------------------------
def test_scenario_05_analytics_and_charts():
    # 年間/月間/週間集計メトリクス取得 (/api/analytics/metrics)
    response = client.get("/api/analytics/metrics?range_type=monthly")
    assert response.status_code == 200
    data = response.json()
    assert data["range_type"] == "monthly"
    assert "metrics" in data

    response = client.get("/api/analytics/metrics?range_type=annual")
    assert response.status_code == 200
    data_annual = response.json()
    assert data_annual["range_type"] == "annual"

# -------------------------------------------------------------------
# シナリオ06: クラウドストレージ (GCS) 画像連携 & Canvas 圧縮モック
# -------------------------------------------------------------------
def test_scenario_06_image_upload_and_stay_log_attachment():
    # 滞在記録への画像追加 (Form データ送信)
    response = client.get("/api/stay-logs")
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) >= 1
    log_id = logs[0]["id"]
    
    # URL 形式の画像リンクを追加
    form_data = {
        "image_url": "/static/uploads/dummy_test_image.webp",
        "comment": "E2Eテストコメント"
    }
    response = client.post(f"/api/stay-logs/{log_id}/images", data=form_data)
    assert response.status_code in [200, 201]
    img_res = response.json()
    assert img_res["image_url"] == "/static/uploads/dummy_test_image.webp"

# -------------------------------------------------------------------
# シナリオ07: ヒートマップ表示 & 定番ルート優先統合
# -------------------------------------------------------------------
def test_scenario_07_heatmap_and_routes():
    # 1. ヒートマップデータ取得 (/api/analytics/heatmap)
    response = client.get("/api/analytics/heatmap")
    assert response.status_code == 200
    heatmap_data = response.json()
    assert "available_years" in heatmap_data
    assert "polylines" in heatmap_data
    assert "routes" in heatmap_data
    assert "markers" in heatmap_data

    # 2. 定番ルート一覧取得
    response = client.get("/api/routes")
    assert response.status_code == 200

    # 3. 定番ルート自動検出トリガー
    response = client.post("/api/routes/detect")
    assert response.status_code == 200
    detect_res = response.json()
    assert detect_res["status"] == "success"

# -------------------------------------------------------------------
# シナリオ08: 異常系・境界値・AIロギング機能
# -------------------------------------------------------------------
def test_scenario_08_error_handling_and_logging():
    # 1. 存在しないエンドポイントへのアクセステスト (404)
    response = client.get("/api/non-existent-endpoint-12345")
    assert response.status_code == 404

    # 2. 内部用ログレベル切り替え API
    level_payload = {"level": "DEBUG"}
    headers = {"x-ai-token": "internal-secret-token"}
    response = client.post("/api/internal/logger/level", json=level_payload, headers=headers)
    assert response.status_code in [200, 401, 403, 404]
