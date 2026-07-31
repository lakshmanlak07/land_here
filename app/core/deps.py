import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


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
    sub = parse_subject_uuid(decode_access_token(token))
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == sub).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
