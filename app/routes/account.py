"""
Account management for the authenticated user.

Currently exposes account deletion ("right to deletion"). This endpoint is the
single place a user's account is destroyed, so it is intentionally strict:

  * Auth-gated   — requires a valid Bearer token (the current user).
  * Confirmation — requires re-entering the account password.
  * Complete     — removes ALL data tied to the user (see ACCOUNT_DELETION.md).

Data model note: nothing in the schema has a foreign key TO `users` (the User
row only references shared `countries` reference data, never the reverse), and
auth uses stateless JWTs with no server-side session/refresh table. So deleting
the single `users` row removes everything user-owned, leaves no orphaned rows,
and immediately invalidates the user's token — `get_current_user` looks the user
up by id on every request and returns 401 once the row is gone.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import rate_limiter
from app.core.security import verify_password
from app.models.user import User
from app.schemas.user import AccountDeleteRequest

router = APIRouter(prefix="/account", tags=["account"])

_delete_limit = rate_limiter("account_delete", limit=5, window_seconds=60)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(_delete_limit)])
def delete_account(
    body: AccountDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete the CURRENT user's account and all associated data.

    Only the logged-in user can delete their own account (the row deleted is
    always `current_user`, derived from the token — never an id from the
    request). The password is re-verified as an explicit confirmation that this
    irreversible action is intended by the account owner.
    """
    if not verify_password(body.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password.",
        )

    # Deleting the User row removes the only user-owned record; no child tables
    # reference the user, so nothing is orphaned. After commit the user's JWT is
    # dead (get_current_user can no longer resolve the id).
    db.delete(current_user)
    db.commit()
    return None
