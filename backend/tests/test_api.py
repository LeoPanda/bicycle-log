import pytest

def test_bike_crud(client):
    # 1. Create
    res = client.post("/api/bikes", json={
        "bike_code": "TEST-BIKE-1",
        "name": "Test Road Bike",
        "brand": "Specialized",
        "model": "Tarmac"
    })
    assert res.status_code == 201
    bike_data = res.json()
    bike_id = bike_data["id"]
    assert bike_data["name"] == "Test Road Bike"

    # 2. List
    res = client.get("/api/bikes")
    assert res.status_code == 200
    bikes = res.json()
    assert len(bikes) >= 1
    assert any(b["id"] == bike_id for b in bikes)

    # 3. Get
    res = client.get(f"/api/bikes/{bike_id}")
    assert res.status_code == 200
    assert res.json()["name"] == "Test Road Bike"

    # 4. Update
    res = client.put(f"/api/bikes/{bike_id}", json={
        "name": "Updated Road Bike"
    })
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Road Bike"

    # 5. Delete
    res = client.delete(f"/api/bikes/{bike_id}")
    assert res.status_code == 204

    # Verify deleted
    res = client.get(f"/api/bikes/{bike_id}")
    assert res.status_code == 404

def test_category_crud(client):
    res = client.post("/api/place-categories", json={
        "name": "テストカフェ",
        "description": "テスト用",
        "icon": "coffee",
        "sort_order": 1
    })
    assert res.status_code == 201
    cat_id = res.json()["id"]

    res = client.get("/api/place-categories")
    assert res.status_code == 200
    assert any(c["id"] == cat_id for c in res.json())

    res = client.delete(f"/api/place-categories/{cat_id}")
    assert res.status_code == 204

def test_tag_crud(client):
    res = client.post("/api/tags", json={"name": "山岳ライド"})
    assert res.status_code == 201
    tag_id = res.json()["id"]

    res = client.get("/api/tags")
    assert res.status_code == 200
    assert any(t["id"] == tag_id for t in res.json())

    res = client.delete(f"/api/tags/{tag_id}")
    assert res.status_code == 204

def test_place_crud(client):
    res = client.post("/api/places", json={
        "id": "place_test_abc",
        "name": "富士山頂展望台",
        "latitude": 35.3606,
        "longitude": 138.7274,
        "address": "静岡県・山梨県"
    })
    assert res.status_code == 201
    assert res.json()["id"] == "place_test_abc"

    res = client.get("/api/places")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert any(p["id"] == "place_test_abc" for p in data["items"])

    res = client.get("/api/places/place_test_abc")
    assert res.status_code == 200
    assert res.json()["name"] == "富士山頂展望台"

    res = client.delete("/api/places/place_test_abc")
    assert res.status_code == 204

def test_analytics_and_search(client):
    res = client.get("/api/analytics/dashboard")
    assert res.status_code == 200
    dash = res.json()
    assert "summary" in dash
    assert "recent_activities" in dash

    res = client.get("/api/search?q=テスト")
    assert res.status_code == 200
    search_data = res.json()
    assert "places" in search_data
    assert "routes" in search_data
