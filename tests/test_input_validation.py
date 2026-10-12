"""
Server-side bounds on account/profile input (POST /auth/register, PATCH /auth/me).

Every rejection must be a 422, never a database error surfacing as a 500.
"""

import pytest

from tests.test_purchases import _account, _email


def _patch(client, headers, **body):
    return client.patch("/auth/me", json=body, headers=headers)


def test_valid_onboarding_update_round_trips(client):
    _, headers, _ = _account(client)
    r = _patch(
        client, headers,
        origin_country_code="in", destination_country_code="US",
        concerns=["visa", "money"], confidence=7, primary_goal="visa",
        first_month_priority="bank",
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["origin_country_code"] == "IN"  # normalised to upper case
    assert body["confidence"] == 7


@pytest.mark.parametrize("code", ["ZZ", "XX"])
def test_unknown_country_code_is_422(client, code):
    _, headers, _ = _account(client)
    assert _patch(client, headers, destination_country_code=code).status_code == 422


@pytest.mark.parametrize("code", ["U", "U$", "TOOLONGCODEX", "12"])
def test_malformed_country_code_is_422(client, code):
    _, headers, _ = _account(client)
    assert _patch(client, headers, origin_country_code=code).status_code == 422


@pytest.mark.parametrize(
    "field,value",
    [
        ("concerns", ["x"] * 13),
        ("concerns", ["x" * 41]),
        ("concerns", [""]),
        ("confidence", 0),
        ("confidence", 11),
        ("first_month_priority", "x" * 31),
        ("primary_goal", "x" * 31),
        ("stage", "not-a-stage"),
    ],
)
def test_out_of_range_profile_values_are_422(client, field, value):
    _, headers, _ = _account(client)
    assert _patch(client, headers, **{field: value}).status_code == 422


def test_register_rejects_unknown_country_with_422(client):
    r = client.post(
        "/auth/register",
        json={"email": _email(), "password": "password123", "destination_country_code": "ZZ"},
    )
    assert r.status_code == 422


def test_register_rejects_oversized_name(client):
    r = client.post(
        "/auth/register",
        json={"email": _email(), "password": "password123", "full_name": "n" * 201},
    )
    assert r.status_code == 422


def test_profile_update_requires_auth(client):
    assert client.patch("/auth/me", json={"confidence": 5}).status_code == 401
