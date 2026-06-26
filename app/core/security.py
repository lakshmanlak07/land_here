from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
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


def _create_token(subject: Any, *, expires_minutes: int, token_type: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": str(subject), "exp": expire, "type": token_type}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: Any) -> str:
    return _create_token(
        subject,
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        token_type=ACCESS_TOKEN_TYPE,
    )


def create_refresh_token(subject: Any) -> str:
    return _create_token(
        subject,
        expires_minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES,
        token_type=REFRESH_TOKEN_TYPE,
    )


def _decode_token(token: str, expected_type: str) -> str | None:
    """Return the token subject iff the signature/expiry are valid AND the token
    is of the expected type; otherwise None. jose verifies `exp` automatically."""
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
