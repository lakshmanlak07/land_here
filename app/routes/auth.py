from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import enforce_limit, rate_limiter
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserOut, UserOnboarding, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])

# Generous per-IP limits: well above any human-driven flow, low enough to
# blunt automated brute-force / credential stuffing. Fail-open (see rate_limit).
_register_limit = rate_limiter("auth_register", limit=15, window_seconds=60)
_login_limit = rate_limiter("auth_login", limit=30, window_seconds=60)

# Constant-work login: when the email doesn't exist we still verify against this
# throwaway hash so response timing doesn't reveal whether an account exists.
_DUMMY_HASH = hash_password("landhere-timing-equalizer")


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_register_limit)],
)
def register(body: UserRegister, db: Session = Depends(get_db)):
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
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id))


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
    enforce_limit(f"auth_login_email:{body.email}", limit=10, window_seconds=900)

    user = db.query(User).filter(User.email == body.email).first()
    if user:
        ok = verify_password(body.password, user.hashed_password)
    else:
        # Burn equivalent bcrypt work so timing doesn't leak account existence.
        verify_password(body.password, _DUMMY_HASH)
        ok = False
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenOut(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
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
