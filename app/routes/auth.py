import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, parse_subject_uuid
from app.core.rate_limit import rate_limiter
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.models.user import User
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserOut,
    UserOnboarding,
    TokenOut,
    RefreshRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Generous per-IP limits: well above any human-driven flow, low enough to
# blunt automated brute-force / credential stuffing. Fail-open (see rate_limit).
_register_limit   = rate_limiter("auth_register",   limit=15,  window_seconds=60)
_login_limit      = rate_limiter("auth_login",      limit=30,  window_seconds=60)
# Refresh fires roughly once per access-token lifetime per device.
_refresh_limit    = rate_limiter("auth_refresh",    limit=60,  window_seconds=60)
# Profile updates: onboarding sends one PATCH per question answered.
_update_me_limit  = rate_limiter("auth_update_me",  limit=60,  window_seconds=60)
# Account deletion is irreversible — be very conservative.
_delete_limit     = rate_limiter("auth_delete",     limit=5,   window_seconds=60)


def _token_pair(user_id) -> TokenOut:
    """Issue a fresh access + refresh token pair for a user id."""
    return TokenOut(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )

# A valid bcrypt hash of a random throwaway value, computed once at import. Login
# verifies against this when the email doesn't exist so the request does the same
# bcrypt work whether or not the account is real — closing the timing side channel
# that would otherwise let an attacker enumerate registered emails. It never
# matches any real password and is not a secret.
_DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_register_limit)],
)
def register(body: UserRegister, db: Session = Depends(get_db)):
    # body.email is already normalized (trimmed + lower-cased) by the schema, so
    # this pre-check and the unique constraint both compare the canonical form.
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        origin_country_code=body.origin_country_code,
        destination_country_code=body.destination_country_code,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Two concurrent signups can both pass the pre-check above; the DB unique
        # constraint on users.email is the real guard. Convert the loser's
        # constraint violation into the same clean 400 instead of a 500.
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    db.refresh(user)
    return _token_pair(user.id)


@router.post(
    "/login",
    response_model=TokenOut,
    dependencies=[Depends(_login_limit)],
)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    # Always run exactly one password verification — against the real hash when
    # the account exists, otherwise a dummy hash — so a non-existent email and a
    # wrong password are indistinguishable in time (no user enumeration).
    hashed = user.hashed_password if user else _DUMMY_PASSWORD_HASH
    password_ok = verify_password(body.password, hashed)
    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_pair(user.id)


@router.post(
    "/refresh",
    response_model=TokenOut,
    dependencies=[Depends(_refresh_limit)],
)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a fresh access + refresh token pair.

    The refresh token is rotated on every use (sliding session). We re-check that
    the user still exists so a deleted account's outstanding refresh token can no
    longer mint access tokens — mirroring get_current_user, which is the only
    other place tokens are honoured. (Tokens are stateless: the previous refresh
    token stays valid until its own expiry; there is no server-side denylist.)
    """
    sub = parse_subject_uuid(decode_refresh_token(body.refresh_token))
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == sub).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _token_pair(user.id)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut, dependencies=[Depends(_update_me_limit)])
def update_me(
    body: UserOnboarding,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # exclude_unset → apply only the fields the client actually sent. An omitted
    # field is left untouched; a field sent explicitly as null clears that value.
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user
