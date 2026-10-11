"""
Free-launch access policy (Oct 2026).

LandHere ships free: PAYWALL_ENABLED and PURCHASES_ENABLED default to False.
These tests pin the guarantees the mobile app relies on:

  * a signed-in account with NO purchase record gets the whole journey, the full
    rankings list, and university detail pages;
  * the server never reports anything as locked;
  * every /purchases/* route is switched off (404) so no store verification or
    notification processing can run;
  * authentication is still required where it was before (free != open).
"""

import uuid

import pytest

from app.core.config import settings
from app.models.purchase import Purchase
from app.models.university import University
from tests.conftest import TestingSessionLocal
from tests.test_purchases import _account

ROWS = 40  # comfortably more than the old free cut of 25


@pytest.fixture(scope="module")
def universities():
    db = TestingSessionLocal()
    ids = []
    try:
        for i in range(ROWS):
            u = University(
                name=f"Free Launch University {i:02d}",
                scorecard_id=f"free-{i}",
                country_code="US",
                state="CA",
                landhere_score=99.0 - i,
                has_full_score=True,
                tuition_out_of_state=30000 + i,
            )
            db.add(u)
            db.flush()
            ids.append(u.id)
        db.commit()
        yield ids
    finally:
        db.query(University).filter(University.id.in_(ids)).delete(synchronize_session=False)
        db.commit()
        db.close()


def test_free_launch_defaults():
    assert settings.PAYWALL_ENABLED is False
    assert settings.PURCHASES_ENABLED is False


def test_free_account_gets_whole_journey(client):
    _, headers, _ = _account(client)
    r = client.get("/info/journey", params={"origin": "IN", "destination": "US"}, headers=headers)
    assert r.status_code == 200
    body = r.json()
    phases = [p["phase"] for p in body["phases"]]
    assert phases == ["after_acceptance", "visa_process", "before_departure", "after_arrival"]
    assert body["locked_phases"] == []
    assert body["pro_required"] is False


def test_anonymous_journey_is_not_locked_either(client):
    r = client.get("/info/journey", params={"origin": "IN", "destination": "US"})
    assert r.status_code == 200
    assert r.json()["locked_phases"] == []
    assert len(r.json()["phases"]) == 4


def test_free_account_sees_full_rankings(client, universities):
    _, headers, _ = _account(client)
    r = client.get("/universities", params={"limit": 200}, headers=headers)
    assert r.status_code == 200
    names = {row["name"] for row in r.json()}
    assert sum(n.startswith("Free Launch University") for n in names) == ROWS
    assert "X-Pro-Required" not in r.headers
    # Paging past the old free cut still returns rows.
    r2 = client.get("/universities", params={"limit": 10, "offset": 30}, headers=headers)
    assert r2.status_code == 200 and len(r2.json()) == 10


def test_free_account_opens_university_detail(client, universities):
    _, headers, _ = _account(client)
    r = client.get(f"/universities/{universities[-1]}", headers=headers)
    assert r.status_code == 200
    assert r.json()["name"].startswith("Free Launch University")


def test_university_detail_still_requires_sign_in(client, universities):
    assert client.get(f"/universities/{universities[0]}").status_code == 401


def test_free_account_has_no_purchase_record(client):
    _, headers, _ = _account(client)
    me = client.get("/auth/me", headers=headers).json()
    db = TestingSessionLocal()
    try:
        assert db.query(Purchase).filter(Purchase.user_id == uuid.UUID(me["id"])).count() == 0
    finally:
        db.close()


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/purchases/entitlements"),
        ("post", "/purchases/verify"),
        ("post", "/purchases/verify/google"),
        ("post", "/purchases/notifications"),
        ("post", "/purchases/notifications/google"),
    ],
)
def test_purchase_routes_are_off(client, method, path):
    _, headers, _ = _account(client)
    r = getattr(client, method)(path, headers=headers, **({"json": {}} if method == "post" else {}))
    assert r.status_code == 404
