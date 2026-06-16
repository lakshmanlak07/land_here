"""Health-check endpoint tests."""


def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "LandHere" in body["service"]
