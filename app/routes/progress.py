"""
Journey progress — which steps the signed-in user has completed.

Every query is scoped to `current_user.id` taken from the access token. No
route accepts a user id, so one account can never read or change another
account's progress (no object-level authorization surface).

The mobile app is offline-first: ticks are stored on the device per account
and sent here in batches when the network is available. Applying the same
batch twice is harmless (idempotent upsert / delete).
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import rate_limiter
from app.models.info_step import InfoStep
from app.models.progress import StepProgress
from app.models.user import User

router = APIRouter(prefix="/progress", tags=["progress"])

_progress_limit = rate_limiter("progress_write", limit=60, window_seconds=60)

MAX_CHANGES = 200


class ProgressChange(BaseModel):
    step_id: uuid.UUID
    completed: bool


class ProgressUpdate(BaseModel):
    changes: list[ProgressChange] = Field(min_length=1, max_length=MAX_CHANGES)


class ProgressOut(BaseModel):
    completed_step_ids: list[uuid.UUID]
    ignored_step_ids: list[uuid.UUID] = []


def _progress_for(db: Session, user: User) -> ProgressOut:
    rows = (
        db.query(StepProgress.step_id)
        .filter(StepProgress.user_id == user.id)
        .order_by(StepProgress.completed_at)
        .all()
    )
    return ProgressOut(completed_step_ids=[r.step_id for r in rows])


@router.get("", response_model=ProgressOut)
def get_progress(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    return _progress_for(db, current_user)


@router.post("", response_model=ProgressOut, dependencies=[Depends(_progress_limit)])
def update_progress(
    body: ProgressUpdate,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply a batch of completed/uncompleted changes, then return the full set.

    Last change per step wins within a batch. Step ids that no longer exist
    (e.g. content removed after the device recorded a tick) are ignored rather
    than failing the batch: a single stale id must never block an account's
    sync forever. They are reported in `ignored_step_ids`.
    """
    response.headers["Cache-Control"] = "private, no-store"
    final: dict[uuid.UUID, bool] = {}
    for change in body.changes:
        final[change.step_id] = change.completed

    known = {
        row.id
        for row in db.query(InfoStep.id).filter(InfoStep.id.in_(list(final))).all()
    }
    unknown = set(final) - known
    for sid in unknown:
        del final[sid]

    try:
        _apply(db, current_user, final)
    except IntegrityError:
        # A concurrent request (another device) inserted one of the same rows
        # first. Roll back and apply once more: the second pass sees that row
        # as existing, so the whole batch still lands.
        db.rollback()
        _apply(db, current_user, final)
    out = _progress_for(db, current_user)
    out.ignored_step_ids = sorted(unknown, key=str)
    return out


def _apply(db: Session, user: User, final: dict[uuid.UUID, bool]) -> None:
    to_delete = [sid for sid, done in final.items() if not done]
    if to_delete:
        db.query(StepProgress).filter(
            StepProgress.user_id == user.id,
            StepProgress.step_id.in_(to_delete),
        ).delete(synchronize_session=False)
    to_add = [sid for sid, done in final.items() if done]
    if to_add:
        existing = {
            r.step_id
            for r in db.query(StepProgress.step_id).filter(
                StepProgress.user_id == user.id,
                StepProgress.step_id.in_(to_add),
            )
        }
        now = datetime.now(timezone.utc)
        for sid in to_add:
            if sid not in existing:
                db.add(StepProgress(user_id=user.id, step_id=sid, completed_at=now))
    db.commit()
