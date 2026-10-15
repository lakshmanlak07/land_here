"""Server-side journey progress (/progress) and the persisted university choice.

Security focus: progress is private per account. No route takes a user id, so
the only way to address progress is through your own token; these tests prove
account B can neither see nor change account A's progress.
"""

import uuid

import pytest

from app.models.info_step import InfoStep
from app.models.progress import StepProgress
from app.models.university import University
from tests.conftest import TestingSessionLocal
from tests.test_purchases import _account


@pytest.fixture(scope="module")
def step_ids():
    db = TestingSessionLocal()
    try:
        rows = (
            db.query(InfoStep.id)
            .filter(InfoStep.origin_code == "IN", InfoStep.destination_code == "US")
            .limit(3)
            .all()
        )
        return [str(r.id) for r in rows]
    finally:
        db.close()


@pytest.fixture(scope="module")
def university_id():
    db = TestingSessionLocal()
    try:
        u = University(scorecard_id="profile-test-1", name="Profile Test University", country_code="US")
        db.add(u)
        db.commit()
        return str(u.id)
    finally:
        db.close()


def _post(client, headers, *changes):
    return client.post(
        "/progress",
        headers=headers,
        json={"changes": [{"step_id": s, "completed": c} for s, c in changes]},
    )


def test_progress_requires_auth(client, step_ids):
    assert client.get("/progress").status_code == 401
    assert client.post("/progress", json={"changes": [{"step_id": step_ids[0], "completed": True}]}).status_code == 401


def test_new_account_has_no_progress(client):
    _, h, _ = _account(client)
    assert client.get("/progress", headers=h).json()["completed_step_ids"] == []


def test_complete_and_uncomplete_round_trip(client, step_ids):
    _, h, _ = _account(client)
    r = _post(client, h, (step_ids[0], True), (step_ids[1], True))
    assert r.status_code == 200
    assert set(r.json()["completed_step_ids"]) == {step_ids[0], step_ids[1]}
    r = _post(client, h, (step_ids[0], False))
    assert r.json()["completed_step_ids"] == [step_ids[1]]
    assert client.get("/progress", headers=h).json()["completed_step_ids"] == [step_ids[1]]


def test_batches_are_idempotent(client, step_ids):
    _, h, _ = _account(client)
    for _ in range(3):
        r = _post(client, h, (step_ids[2], True))
    assert r.json()["completed_step_ids"] == [step_ids[2]]


def test_last_change_in_batch_wins(client, step_ids):
    _, h, _ = _account(client)
    r = _post(client, h, (step_ids[0], True), (step_ids[0], False))
    assert r.json()["completed_step_ids"] == []


def test_accounts_are_isolated(client, step_ids):
    _, a, _ = _account(client)
    _, b, _ = _account(client)
    _post(client, a, (step_ids[0], True), (step_ids[1], True))
    assert client.get("/progress", headers=b).json()["completed_step_ids"] == []
    # B "uncompleting" the same steps must not touch A's rows.
    _post(client, b, (step_ids[0], False), (step_ids[1], False))
    assert set(client.get("/progress", headers=a).json()["completed_step_ids"]) == {step_ids[0], step_ids[1]}


def test_unknown_step_ignored_and_known_steps_still_applied(client, step_ids):
    _, h, _ = _account(client)
    ghost = str(uuid.uuid4())
    r = _post(client, h, (step_ids[0], True), (ghost, True))
    assert r.status_code == 200
    assert r.json()["completed_step_ids"] == [step_ids[0]]
    assert r.json()["ignored_step_ids"] == [ghost]


@pytest.mark.parametrize("body", [{"changes": []}, {"changes": "x"}, {}, {"changes": [{"step_id": "not-a-uuid", "completed": True}]}])
def test_malformed_bodies_rejected(client, body):
    _, h, _ = _account(client)
    assert client.post("/progress", headers=h, json=body).status_code == 422


def test_batch_size_capped(client, step_ids):
    _, h, _ = _account(client)
    changes = [{"step_id": step_ids[0], "completed": True}] * 201
    assert client.post("/progress", headers=h, json={"changes": changes}).status_code == 422


def test_account_deletion_removes_progress(client, step_ids):
    _, h, pw = _account(client)
    me = client.get("/auth/me", headers=h).json()
    _post(client, h, (step_ids[0], True))
    assert client.request("DELETE", "/account", headers=h, json={"password": pw}).status_code == 204
    db = TestingSessionLocal()
    try:
        assert db.query(StepProgress).filter(StepProgress.user_id == uuid.UUID(me["id"])).count() == 0
    finally:
        db.close()


def test_university_choice_is_persisted_and_returned(client, university_id):
    _, h, _ = _account(client)
    r = client.patch("/auth/me", headers=h, json={"university_id": university_id})
    assert r.status_code == 200, r.text
    me = client.get("/auth/me", headers=h).json()
    assert me["university_id"] == university_id
    assert me["university_name"] == "Profile Test University"


def test_unknown_university_rejected(client):
    _, h, _ = _account(client)
    assert client.patch("/auth/me", headers=h, json={"university_id": str(uuid.uuid4())}).status_code == 422


def test_university_choice_can_be_cleared(client, university_id):
    _, h, _ = _account(client)
    client.patch("/auth/me", headers=h, json={"university_id": university_id})
    r = client.patch("/auth/me", headers=h, json={"university_id": None})
    assert r.status_code == 200 and r.json()["university_id"] is None


def test_full_name_can_be_updated_and_bounded(client):
    _, h, _ = _account(client)
    r = client.patch("/auth/me", headers=h, json={"full_name": "Asha Rao"})
    assert r.status_code == 200 and r.json()["full_name"] == "Asha Rao"
    assert client.patch("/auth/me", headers=h, json={"full_name": "x" * 201}).status_code == 422
