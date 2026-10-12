from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from jwt import PyJWTError as JWTError
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# Token "type" claim values. Tagging each token lets us reject a refresh token
# presented as an access token (and vice versa): a stolen refresh token then
# can't be used to call protected endpoints directly, only to mint short-lived
# access tokens at /auth/refresh.
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def _create_token(
    subject: Any, *, expires_minutes: int, token_type: str, jti: str | None = None
) -> tuple[str, datetime]:
    """Return (encoded token, absolute expiry). The expiry is returned so callers
    that persist token state don't have to re-derive it."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": str(subject), "exp": expire, "type": token_type}
    if jti is not None:
        payload["jti"] = jti
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM), expire


def create_access_token(subject: Any) -> str:
    token, _ = _create_token(
        subject,
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        token_type=ACCESS_TOKEN_TYPE,
    )
    return token


def create_refresh_token(subject: Any, *, jti: str) -> tuple[str, datetime]:
    """Refresh tokens always carry a jti so the server can track rotation state
    (app/models/refresh_token.py). Returns (token, expires_at)."""
    return _create_token(
        subject,
        expires_minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES,
        token_type=REFRESH_TOKEN_TYPE,
        jti=jti,
    )


def _decode_claims(token: str, expected_type: str) -> dict | None:
    """Return the full claim set iff signature/expiry are valid AND the token is
    of the expected type; otherwise None."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload


def _decode_token(token: str, expected_type: str) -> str | None:
    """Return the token subject iff the signature/expiry are valid AND the token
    is of the expected type; otherwise None. PyJWT verifies `exp` automatically."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload.get("sub")


def decode_access_token(token: str) -> str | None:
    return _decode_token(token, ACCESS_TOKEN_TYPE)


def decode_refresh_token(token: str) -> str | None:
    return _decode_token(token, REFRESH_TOKEN_TYPE)


def decode_refresh_claims(token: str) -> dict | None:
    """Claims of a valid refresh token (needs `jti` for replay checking)."""
    return _decode_claims(token, REFRESH_TOKEN_TYPE)
