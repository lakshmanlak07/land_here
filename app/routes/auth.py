import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, parse_subject_uuid
from app.core.rate_limit import enforce_limit, rate_limiter
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_claims,
)
from app.core.config import settings
from app.core.mailer import send_email
from app.models.country import Country
from app.models.password_reset import PasswordResetToken
from app.models.university import University
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserOut,
    UserOnboarding,
    TokenOut,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Generous per-IP limits: well above any human-driven flow, low enough to
# blunt automated brute-force / credential stuffing. Fails CLOSED: a limiter
# error rejects the request with 429 rather than allowing it (see rate_limit).
_register_limit   = rate_limiter("auth_register",   limit=15,  window_seconds=60)
_login_limit      = rate_limiter("auth_login",      limit=30,  window_seconds=60)
# Refresh fires roughly once per access-token lifetime per device.
_refresh_limit    = rate_limiter("auth_refresh",    limit=60,  window_seconds=60)
# Profile updates: onboarding sends one PATCH per question answered.
_update_me_limit  = rate_limiter("auth_update_me",  limit=60,  window_seconds=60)
# Account deletion is irreversible — be very conservative.
_delete_limit     = rate_limiter("auth_delete",     limit=5,   window_seconds=60)


def _token_pair(user_id, db: Session, *, family_id: uuid.UUID | None = None) -> TokenOut:
    """Issue an access + refresh token pair and record the refresh token's id.

    `family_id` continues an existing session lineage (rotation); omitting it
    starts a new one (fresh login). The row is what makes replay detectable —
    see app/models/refresh_token.py.
    """
    jti = uuid.uuid4()
    refresh_token, expires_at = create_refresh_token(user_id, jti=str(jti))
    db.add(
        RefreshToken(
            id=jti,
            user_id=user_id,
            family_id=family_id or jti,
            expires_at=expires_at,
        )
    )
    db.commit()
    return TokenOut(
        access_token=create_access_token(user_id),
        refresh_token=refresh_token,
    )


def _revoke_family(db: Session, family_id: uuid.UUID) -> None:
    """Kill every live token in one session lineage. Called on replay detection
    and on logout."""
    now = datetime.now(timezone.utc)
    db.query(RefreshToken).filter(
        RefreshToken.family_id == family_id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": now}, synchronize_session=False)
    db.commit()


_INVALID_REFRESH = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired refresh token",
    headers={"WWW-Authenticate": "Bearer"},
)

# A valid bcrypt hash of a random throwaway value, computed once at import. Login
# verifies against this when the email doesn't exist so the request does the same
# bcrypt work whether or not the account is real — closing the timing side channel
# that would otherwise let an attacker enumerate registered emails. It never
# matches any real password and is not a secret.
_DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))

# Registration failure message. Deliberately generic and identical for a
# duplicate email and for other rejected-registration cases, so a scripted
# caller can't read "this email exists" straight off the response body.
#
# This REDUCES obvious disclosure; it does not eliminate email enumeration. Any
# register endpoint that refuses a duplicate is still an oracle (via status code,
# timing, or simply the fact that registration failed). The real fix is an
# email-verification flow where both the new-account and existing-account paths
# return the same "check your inbox" response and no token — tracked as a
# post-launch item.
_REGISTER_REJECTED = "Unable to register with these details."


def _require_known_countries(db: Session, *codes: str | None) -> None:
    """422 for a country code that is not in `countries`, instead of letting the
    foreign key fail at commit time as a 500."""
    for code in codes:
        if code is not None and db.query(Country.id).filter(Country.code == code).first() is None:
            raise HTTPException(
                status_code=422,
                detail="Unknown country code.",
            )


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_register_limit)],
)
def register(body: UserRegister, db: Session = Depends(get_db)):
    _require_known_countries(db, body.origin_country_code, body.destination_country_code)
    # body.email is already normalized (trimmed + lower-cased) by the schema, so
    # this pre-check and the unique constraint both compare the canonical form.
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail=_REGISTER_REJECTED)
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
        raise HTTPException(status_code=400, detail=_REGISTER_REJECTED)
    db.refresh(user)
    return _token_pair(user.id, db)


@router.post(
    "/login",
    response_model=TokenOut,
    dependencies=[Depends(_login_limit)],
)
def login(body: UserLogin, db: Session = Depends(get_db)):
    # Per-account bucket on top of the per-IP limit: blunts distributed
    # credential stuffing against one account. Applied before the password check
    # and regardless of whether the account exists, so the 429 itself can't be
    # used to enumerate accounts. Window is short (15 min) to keep lockout-abuse
    # (attacker deliberately exhausting someone's bucket) an annoyance, not a
    # durable denial of access.
    enforce_limit(f"rl:auth_login_email:{body.email}", limit=10, window_seconds=900)

    user = db.query(User).filter(User.email == body.email).first()
    # Always run exactly one password verification — against the real hash when
    # the account exists, otherwise a dummy hash — so a non-existent email and a
    # wrong password are indistinguishable in time (no user enumeration).
    hashed = user.hashed_password if user else _DUMMY_PASSWORD_HASH
    password_ok = verify_password(body.password, hashed)
    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_pair(user.id, db)


@router.post(
    "/refresh",
    response_model=TokenOut,
    dependencies=[Depends(_refresh_limit)],
)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a fresh access + refresh token pair.

    Rotation is replay-safe: each refresh token is recorded by id, and using one
    marks it revoked. Presenting an already-rotated token is treated as theft —
    the entire family is revoked, so the attacker AND the legitimate device are
    logged out rather than the attacker keeping a live session. That is the
    intended trade: a forced re-login beats a silent account takeover.
    """
    claims = decode_refresh_claims(body.refresh_token)
    if claims is None:
        raise _INVALID_REFRESH
    user_id = parse_subject_uuid(claims.get("sub"))
    jti = parse_subject_uuid(claims.get("jti"))
    if user_id is None or jti is None:
        raise _INVALID_REFRESH

    record = db.query(RefreshToken).filter(RefreshToken.id == jti).first()
    if record is None or record.user_id != user_id:
        # Signed, unexpired, but unknown to us (e.g. issued before this table
        # existed, or the account was deleted) — refuse rather than trust it.
        raise _INVALID_REFRESH

    if record.revoked_at is not None:
        # Replay: this token was already rotated away or explicitly revoked.
        _revoke_family(db, record.family_id)
        raise _INVALID_REFRESH

    # Re-check the user still exists so a deleted account's outstanding refresh
    # token can no longer mint access tokens.
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise _INVALID_REFRESH

    # Claim the token with a CONDITIONAL update rather than a read-then-write.
    #
    # The check above and this revocation used to be separate statements, so two
    # requests carrying the same refresh token could both observe
    # `revoked_at IS NULL`, both write, and both be issued a valid pair — a
    # stolen token used at the same instant as the legitimate device produced
    # two live sessions and reuse detection never fired. Racing it defeated the
    # control that rotation exists to provide.
    #
    # `UPDATE ... WHERE id = :jti AND revoked_at IS NULL` makes the database
    # pick exactly one winner: the row count is 1 for the first writer and 0 for
    # every other, whatever the interleaving.
    claimed = (
        db.query(RefreshToken)
        .filter(RefreshToken.id == jti, RefreshToken.revoked_at.is_(None))
        .update({"revoked_at": datetime.now(timezone.utc)}, synchronize_session=False)
    )
    db.commit()
    if claimed == 0:
        # Someone else rotated this token first. Indistinguishable from replay,
        # and treated as replay on purpose: failing closed on a security control
        # is right, and a legitimate client already serialises its own refreshes.
        _revoke_family(db, record.family_id)
        raise _INVALID_REFRESH

    return _token_pair(user.id, db, family_id=record.family_id)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    """Revoke the session lineage this refresh token belongs to.

    Always 204, even for a token we can't resolve: logout must not become an
    oracle for whether a token is valid, and the client's local state is cleared
    either way.
    """
    claims = decode_refresh_claims(body.refresh_token)
    if claims is None:
        return None
    jti = parse_subject_uuid(claims.get("jti"))
    if jti is None:
        return None
    record = db.query(RefreshToken).filter(RefreshToken.id == jti).first()
    if record is not None:
        _revoke_family(db, record.family_id)
    return None


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
    updates = body.model_dump(exclude_unset=True)
    _require_known_countries(
        db, updates.get("origin_country_code"), updates.get("destination_country_code")
    )
    if updates.get("university_id") is not None and db.get(University, updates["university_id"]) is None:
        raise HTTPException(status_code=422, detail="Unknown university.")
    for field, value in updates.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Password recovery ─────────────────────────────────────────────────────────
# forgot: always 202 with the same body, whether or not the email has an
# account (no enumeration). The email is sent in a background task so the
# response time does not reveal it either. Tokens are 256-bit random, stored
# only as SHA-256, single use, short-lived; issuing a new one invalidates the
# older ones. reset: sets the password and revokes EVERY refresh-token family,
# signing out all devices (incl. whoever may have had the old password).

_forgot_ip_limit = rate_limiter("auth_forgot", limit=10, window_seconds=600)
_reset_limit = rate_limiter("auth_reset", limit=20, window_seconds=600)

_FORGOT_ACCEPTED = {
    "detail": "If an account exists for that email, a reset link is on its way."
}
_RESET_INVALID = HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="This reset link is invalid or has expired. Request a new one.",
)


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _reset_email_text(token: str) -> str:
    link = f"{settings.PASSWORD_RESET_URL}?token={token}"
    return "\n".join(
        [
            "Someone asked to reset the password for your LandHere account.",
            "",
            "Open this link on your phone to choose a new password:",
            link,
            "",
            'Or open LandHere, tap "Forgot password?", then "I have a code", and paste:',
            token,
            "",
            f"It expires in {settings.PASSWORD_RESET_TTL_MINUTES} minutes and works once.",
            "If you didn't ask for this, ignore this email; your password stays the same.",
        ]
    )


@router.post(
    "/password/forgot",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(_forgot_ip_limit)],
)
def forgot_password(
    body: ForgotPasswordRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Per-address cap too, so one inbox cannot be flooded from many IPs.
    enforce_limit(f"rl:auth_forgot_email:{body.email}", limit=3, window_seconds=900)
    user = db.query(User).filter(User.email == body.email).first()
    if user is None:
        return _FORGOT_ACCEPTED

    now = datetime.now(timezone.utc)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)
    token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_reset_token(token),
            expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_TTL_MINUTES),
        )
    )
    db.commit()
    background.add_task(
        send_email, user.email, "Reset your LandHere password", _reset_email_text(token)
    )
    return _FORGOT_ACCEPTED


@router.post(
    "/password/reset",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(_reset_limit)],
)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    # Claim the token atomically: exactly one request can flip used_at.
    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == _hash_reset_token(body.token))
        .first()
    )
    if record is None or record.used_at is not None:
        raise _RESET_INVALID
    expires_at = record.expires_at
    if expires_at.tzinfo is None:  # SQLite drops tz info
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise _RESET_INVALID
    claimed = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.id == record.id, PasswordResetToken.used_at.is_(None))
        .update({"used_at": now}, synchronize_session=False)
    )
    if claimed == 0:
        db.rollback()
        raise _RESET_INVALID
    user = db.query(User).filter(User.id == record.user_id).first()
    if user is None:
        db.rollback()
        raise _RESET_INVALID
    user.hashed_password = hash_password(body.new_password)
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": now}, synchronize_session=False)
    db.commit()
    return None
