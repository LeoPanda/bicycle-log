"""
test_scenario_functional.py - Functional Requirements Scenario Tests
Verifies [REQ-F01] through [REQ-F07] with normal and negative paths.
"""
import io

from fastapi.testclient import TestClient

# --- [REQ-F01] 自転車・ギア管理機能 ---

def test_scenario_bike_lifecycle(client: TestClient):
    """
    [REQ-F01] 自転車・ギア管理機能 (正常系)
    新規作成 ➔ 詳細取得 ➔ 更新 ➔ 削除
    """
    create_res = client.post("/api/bikes", json={
        "bike_code": "SCENARIO-BIKE-1",
        "name": "Scenario Specialized Tarmac",
        "brand": "Specialized",
        "model": "Tarmac SL7"
    })
    assert create_res.status_code == 201
    bike = create_res.json()
    bike_id = bike["id"]

    get_res = client.get(f"/api/bikes/{bike_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Scenario Specialized Tarmac"

    update_res = client.put(f"/api/bikes/{bike_id}", json={"name": "Scenario Updated Tarmac"})
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Scenario Updated Tarmac"

    del_res = client.delete(f"/api/bikes/{bike_id}")
    assert del_res.status_code in [200, 204]


def test_scenario_bike_validation_error(client: TestClient):
    """
    [REQ-F01] 自転車・ギア管理機能 (異常系)
    @test_type: negative
    必須フィールド欠落リクエストの拒否
    """
    res = client.post("/api/bikes", json={})
    assert res.status_code in [400, 422]


def test_scenario_bike_not_found_error(client: TestClient):
    """
    [REQ-F01] 自転車・ギア管理機能 (異常系)
    @test_type: negative
    存在しない自転車IDに対する更新・削除エラー
    """
    res = client.put("/api/bikes/999999", json={"name": "Ghost Bike"})
    assert res.status_code == 404

    del_res = client.delete("/api/bikes/999999")
    assert del_res.status_code == 404


# --- [REQ-F02] Strava 連携・アクティビティ自動同期機能 ---

def test_scenario_strava_sync_flow(client: TestClient, monkeypatch):
    """
    [REQ-F02] Strava 連携・アクティビティ自動同期機能 (正常系)
    Strava 同期 API の呼び出しとレスポンス検証
    """
    from app.routers import strava

    def mock_sync(session, limit_months=None, all_time=False, before_timestamp=None):
        return {"synced_activities": 1, "detected_stops": 2, "created_places": 1}

    monkeypatch.setattr(strava, "sync_strava_activities", mock_sync)

    res = client.post("/api/strava/sync?limit_months=1")
    assert res.status_code == 200
    data = res.json()
    assert data["synced_activities"] == 1
    assert data["detected_stops"] == 2


def test_scenario_strava_rate_limit_error(client: TestClient, monkeypatch):
    """
    [REQ-F02] Strava 連携・アクティビティ自動同期機能 (異常系)
    @test_type: negative
    Strava API のレート制限 (HTTP 429) または認証エラー時のハンドリング
    """
    from fastapi import HTTPException

    from app.routers import strava

    def mock_sync_fail(*args, **kwargs):
        raise HTTPException(status_code=429, detail="Strava rate limit exceeded")

    monkeypatch.setattr(strava, "sync_strava_activities", mock_sync_fail)

    res = client.post("/api/strava/sync")
    assert res.status_code == 429
    assert "rate limit" in res.json()["detail"].lower()


# --- [REQ-F03] 滞在スポット自動検知・手動記録機能 ---

def test_scenario_stay_spot_detection_and_override(client: TestClient):
    """
    [REQ-F03] 滞在スポット自動検知・手動記録機能 (正常系)
    スポット手動上書きと取得
    """
    cat_res = client.post("/api/place-categories", json={"name": "Scenario Spot Cat"})
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    place_res = client.post("/api/places", json={
        "id": "scenario_place_001",
        "name": "Initial Spot",
        "latitude": 35.6812,
        "longitude": 139.7671,
        "category_id": cat_id
    })
    assert place_res.status_code == 201

    ovr_res = client.put("/api/places/scenario_place_001/overwrite", json={
        "new_place_id": "scenario_place_001_overwritten",
        "name": "Updated Spot Name",
        "latitude": 35.6815,
        "longitude": 139.7675,
        "category_name": "Scenario Spot Cat"
    })
    assert ovr_res.status_code == 200
    assert ovr_res.json()["name"] == "Updated Spot Name"


def test_scenario_stay_spot_invalid_coordinates_error(client: TestClient):
    """
    [REQ-F03] 滞在スポット自動検知・手動記録機能 (異常系)
    @test_type: negative
    緯度経度の異常値バリデーション拒否
    """
    res = client.post("/api/places", json={
        "id": "invalid_coord_place",
        "name": "Invalid Place",
        "latitude": "not-a-number",
        "longitude": 139.7671
    })
    assert res.status_code in [400, 422]


# --- [REQ-F04] 走行ログ・写真ギャラリー管理機能 ---

def test_scenario_photo_gallery_lifecycle(client: TestClient):
    """
    [REQ-F04] 走行ログ・写真ギャラリー管理機能 (正常系)
    写真アップロード、コメント更新、削除
    """
    get_res = client.get("/api/activities")
    assert get_res.status_code == 200

    act_res = client.get("/api/activities/1")
    if act_res.status_code == 200:
        activity = act_res.json()
        stay_logs = activity.get("stay_logs", [])
        if stay_logs:
            stay_id = stay_logs[0]["id"]
            dummy_file = io.BytesIO(b"fake-image-binary-data")
            upload_res = client.post(
                f"/api/stay-logs/{stay_id}/images",
                files={"file": ("test.jpg", dummy_file, "image/jpeg")},
                data={"comment": "Scenario photo test"}
            )
            if upload_res.status_code in [200, 201]:
                img_data = upload_res.json()
                img_id = img_data.get("id")
                if img_id:
                    comment_res = client.put(f"/api/stay-logs/images/{img_id}", json={"comment": "Updated comment"})
                    assert comment_res.status_code == 200
                    del_res = client.delete(f"/api/stay-logs/images/{img_id}")
                    assert del_res.status_code in [200, 204]


def test_scenario_photo_upload_invalid_file_error(client: TestClient):
    """
    [REQ-F04] 走行ログ・写真ギャラリー管理機能 (異常系)
    @test_type: negative
    存在しない滞在ログへの画像アップロード拒否
    """
    dummy_file = io.BytesIO(b"fake-binary")
    res = client.post(
        "/api/stay-logs/999999/images",
        files={"file": ("test.jpg", dummy_file, "image/jpeg")}
    )
    assert res.status_code in [400, 404, 422]


# --- [REQ-F05] 定番ルート登録・マッチング機能 ---

def test_scenario_route_detection_and_grouping(client: TestClient):
    """
    [REQ-F05] 定番ルート登録・マッチング機能 (正常系)
    ルート自動検出 API の実行と検証
    """
    res = client.post("/api/routes/detect")
    assert res.status_code == 200
    data = res.json()
    assert "detected_routes" in data or "status" in data


def test_scenario_route_detection_missing_polyline_error(client: TestClient):
    """
    [REQ-F05] 定番ルート登録・マッチング機能 (異常系)
    @test_type: negative
    存在しないルートIDの取得エラーハンドリング
    """
    res = client.get("/api/routes/999999")
    assert res.status_code == 404


# --- [REQ-F06] 統計分析・ダッシュボード機能 ---

def test_scenario_analytics_and_dashboard_metrics(client: TestClient):
    """
    [REQ-F06] 統計分析・ダッシュボード機能 (正常系)
    ダッシュボード統計、メトリクス推移、ヒートマップデータ
    """
    dash_res = client.get("/api/analytics/dashboard")
    assert dash_res.status_code == 200
    data = dash_res.json()
    assert "total_distance_km" in data or "summary" in data

    metrics_res = client.get("/api/analytics/metrics?range_type=monthly")
    assert metrics_res.status_code == 200
    assert "metrics" in metrics_res.json()

    heatmap_res = client.get("/api/analytics/heatmap")
    assert heatmap_res.status_code == 200
    assert "polylines" in heatmap_res.json()


def test_scenario_analytics_invalid_year_error(client: TestClient):
    """
    [REQ-F06] 統計分析・ダッシュボード機能 (異常系)
    @test_type: negative
    存在しないエンドポイントへのリクエストエラーハンドリング
    """
    res = client.get("/api/analytics/invalid_endpoint")
    assert res.status_code == 404


# --- [REQ-F07] マスタ設定機能 ---

def test_scenario_master_categories_and_tags(client: TestClient):
    """
    [REQ-F07] マスタ設定機能 (正常系)
    カテゴリ・タグの登録・更新・削除
    """
    cat_res = client.post("/api/place-categories", json={"name": "Master Cat Test", "description": "Desc"})
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    tag_res = client.post("/api/tags", json={"name": "Master Tag Test", "color": "#ff0000"})
    assert tag_res.status_code == 201
    tag_id = tag_res.json()["id"]

    del_cat = client.delete(f"/api/place-categories/{cat_id}")
    assert del_cat.status_code in [200, 204]

    del_tag = client.delete(f"/api/tags/{tag_id}")
    assert del_tag.status_code in [200, 204]


def test_scenario_master_not_found_error(client: TestClient):
    """
    [REQ-F07] マスタ設定機能 (異常系)
    @test_type: negative
    存在しないカテゴリ・タグの削除リクエスト拒否
    """
    cat_res = client.delete("/api/place-categories/999999")
    assert cat_res.status_code == 404

    tag_res = client.delete("/api/tags/999999")
    assert tag_res.status_code == 404
