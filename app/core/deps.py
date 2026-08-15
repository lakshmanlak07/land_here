import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
# Same scheme, but a missing/!invalid Authorization header yields None instead of
# a 401. Used by endpoints that serve both anonymous free users and Pro users.
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def parse_subject_uuid(sub: str | None) -> uuid.UUID | None:
    """JWT subjects are strings; the users PK is a UUID. Convert explicitly so
    the query works on every backend (Postgres casts str→uuid implicitly,
    SQLite's Uuid type does not). Malformed subjects → None (→ 401)."""
    if sub is None:
        return None
    try:
        return uuid.UUID(sub)
    except (ValueError, AttributeError, TypeError):
        return None


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    user_id = parse_subject_uuid(decode_access_token(token))
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    """The current user, or None for an anonymous caller.

    A bad token is treated as anonymous rather than as an error: these endpoints
    are readable without an account, so the worst outcome of an unusable token
    is the free tier, not a 401.
    """
    if not token:
        return None
    user_id = parse_subject_uuid(decode_access_token(token))
    if user_id is None:
        return None
    return db.query(User).filter(User.id == user_id).first()


def user_has_pro(db: Session, user: User | None) -> bool:
    """True when this user owns a verified, unrevoked LandHere Pro purchase.

    The single place entitlement is decided. Reads the purchases table — never a
    client-supplied flag, a request header, or anything persisted on the device.
    """
    if user is None:
        return False
    # Imported here rather than at module scope: app.models.purchase imports
    # Base, and deps is imported early enough that a top-level import would
    # reorder table registration.
    from app.models.purchase import Purchase

    return (
        db.query(Purchase.id)
        .filter(Purchase.user_id == user.id, Purchase.revoked_at.is_(None))
        .first()
        is not None
    )


def require_pro(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Gate a route behind LandHere Pro. 401 when signed out, 403 when signed in
    without a purchase — the mobile app routes the 403 to the paywall."""
    if not user_has_pro(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="LandHere Pro required.",
        )
    return current_user
