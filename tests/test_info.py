"""
Tests for the /info endpoints.
All read-only — relies on the IN→US steps seeded in conftest.py.

With the free launch (PAYWALL_ENABLED=False) every caller sees the complete
journey. The tests below use an ordinary account with NO purchase record, which
is itself the free-access guarantee. The dormant paid-tier shape is still
asserted in tests/test_purchases.py under the paid_mode fixture.
"""

import pytest

from tests.test_purchases import _account

EXPECTED_PHASES = ["after_acceptance", "visa_process", "before_departure", "after_arrival"]


@pytest.fixture
def pro_headers(client):
    """An ordinary free account - no purchase - which must see the whole journey."""
    _, headers, _ = _account(client)
    return headers


def test_list_phases(client):
    response = client.get("/info/phases")
    assert response.status_code == 200
    phases = response.json()["phases"]
    assert isinstance(phases, list)
    assert len(phases) == 5  # VALID_PHASES has 5 entries


def test_list_corridors_includes_in_us(client):
    response = client.get("/info/corridors")
    assert response.status_code == 200
    corridors = response.json()
    assert isinstance(corridors, list)
    assert len(corridors) >= 1
    pairs = [(c["origin_code"], c["destination_code"]) for c in corridors]
    assert ("IN", "US") in pairs


def test_corridor_schema(client):
    response = client.get("/info/corridors")
    assert response.status_code == 200
    for corridor in response.json():
        assert "origin_code" in corridor
        assert "destination_code" in corridor


def test_journey_in_us_returns_4_phases(client, pro_headers):
    response = client.get(
        "/info/journey", params={"origin": "IN", "destination": "US"}, headers=pro_headers
    )
    assert response.status_code == 200
    journey = response.json()
    phase_names = [p["phase"] for p in journey["phases"]]
    assert len(phase_names) == 4
    for name in EXPECTED_PHASES:
        assert name in phase_names


def test_journey_in_us_phases_in_chronological_order(client, pro_headers):
    """Phases must appear in the order defined by VALID_PHASES."""
    response = client.get(
        "/info/journey", params={"origin": "IN", "destination": "US"}, headers=pro_headers
    )
    assert response.status_code == 200
    phase_names = [p["phase"] for p in response.json()["phases"]]
    assert phase_names == EXPECTED_PHASES


def test_journey_in_us_total_steps(client, pro_headers):
    response = client.get(
        "/info/journey", params={"origin": "IN", "destination": "US"}, headers=pro_headers
    )
    assert response.status_code == 200
    journey = response.json()
    total = sum(len(p["steps"]) for p in journey["phases"])
    assert total == 15  # 2 + 5 + 4 + 4


def test_journey_step_schema(client):
    response = client.get("/info/journey", params={"origin": "IN", "destination": "US"})
    assert response.status_code == 200
    for phase in response.json()["phases"]:
        for step in phase["steps"]:
            assert "id" in step
            assert "title" in step
            assert "explanation" in step
            assert "official_source_name" in step
            assert "official_source_url" in step
            assert "is_verified" in step


def test_journey_destination_only_no_origin(client):
    """Querying with only destination= should still return steps."""
    response = client.get("/info/journey", params={"destination": "US"})
    assert response.status_code == 200
    journey = response.json()
    assert journey["destination"] == "US"
    assert journey["origin"] is None


def test_journey_nonexistent_corridor_returns_empty(client):
    # Unknown corridors return an empty journey (200) — the app shows a friendly
    # "no steps yet" state instead of an error.
    response = client.get("/info/journey", params={"origin": "AU", "destination": "NZ"})
    assert response.status_code == 200
    assert response.json()["phases"] == []


def test_journey_response_top_level_schema(client):
    response = client.get("/info/journey", params={"origin": "IN", "destination": "US"})
    assert response.status_code == 200
    body = response.json()
    assert body["origin"] == "IN"
    assert body["destination"] == "US"
    assert isinstance(body["phases"], list)
