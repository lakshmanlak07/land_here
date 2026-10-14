import uuid
from datetime import datetime
from enum import Enum
from typing import Annotated
from pydantic import AfterValidator, BaseModel, EmailStr, Field

# Upper bound guards against very long inputs (bcrypt work scales with length;
# it also only uses the first 72 bytes, so longer is pointless). The mobile app
# already enforces an 8-char minimum on registration.
_MAX_PASSWORD_LEN = 128


def _normalize_email(value: str) -> str:
    """Trim surrounding whitespace and lower-case the address so that, e.g.,
    'Foo@X.com ' and 'foo@x.com' resolve to the same account. Applied at the
    schema layer so registration, login, and every lookup that flows through
    these models normalize identically and can never drift apart."""
    return value.strip().lower()


# EmailStr validates RFC format first; the AfterValidator then normalizes the
# already-valid address. Reused by every auth model so the rule lives in one place.
NormalizedEmail = Annotated[EmailStr, AfterValidator(_normalize_email)]

# Country codes as stored in `countries.code` (e.g. "US", "IN", "UK"). Shape is
# checked here; existence is checked against the table in the route, so an
# unknown code is a 422 instead of a foreign-key error (500).
CountryCode = Annotated[
    str,
    AfterValidator(lambda v: v.strip().upper()),
    Field(min_length=2, max_length=10, pattern=r"^\s*[A-Za-z]{2,10}\s*$"),
]


class UserRegister(BaseModel):
    email: NormalizedEmail
    password: str = Field(min_length=8, max_length=_MAX_PASSWORD_LEN)
    full_name: str | None = Field(None, max_length=200)
    origin_country_code: CountryCode | None = None
    destination_country_code: CountryCode | None = None


class UserLogin(BaseModel):
    email: NormalizedEmail
    # No minimum here (avoids rejecting any pre-existing account); cap only.
    password: str = Field(max_length=_MAX_PASSWORD_LEN)


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    origin_country_code: str | None
    destination_country_code: str | None
    created_at: datetime
    stage: str | None
    wants_to_work: bool | None
    wants_scholarships: bool | None
    concerns: list[str] | None
    first_month_priority: str | None
    first_timer: bool | None
    confidence: int | None
    primary_goal: str | None
    university_id: uuid.UUID | None = None
    university_name: str | None = None

    model_config = {"from_attributes": True}


class StageEnum(str, Enum):
    deciding = "deciding"
    accepted = "accepted"
    visa_process = "visa_process"
    about_to_fly = "about_to_fly"
    landed = "landed"


class UserOnboarding(BaseModel):
    """Partial onboarding profile — every field optional so callers can PATCH
    one answer at a time. Only fields actually present in the request body are
    applied (see PATCH /auth/me); unset fields are left untouched."""
    full_name: str | None = Field(None, max_length=200)

    origin_country_code: CountryCode | None = None
    destination_country_code: CountryCode | None = None
    stage: StageEnum | None = None
    wants_to_work: bool | None = None
    wants_scholarships: bool | None = None
    # Bounded so one account cannot store arbitrarily large JSON.
    concerns: list[Annotated[str, Field(min_length=1, max_length=40)]] | None = Field(
        None, max_length=12
    )
    # Column is String(30); reject longer values with a 422, not a DB error.
    first_month_priority: str | None = Field(None, max_length=30)
    first_timer: bool | None = None
    confidence: int | None = Field(None, ge=1, le=10)
    primary_goal: str | None = Field(None, max_length=30)
    university_id: uuid.UUID | None = None


class TokenOut(BaseModel):
    access_token: str
    # Long-lived token the client stores securely and sends to POST /auth/refresh
    # to obtain a fresh access_token without re-entering credentials.
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: NormalizedEmail


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=8, max_length=_MAX_PASSWORD_LEN)


class AccountDeleteRequest(BaseModel):
    # Re-entering the password is the irreversible-action confirmation: deletion
    # must require proof of identity beyond merely possessing the token (e.g. an
    # unlocked, unattended device). Cap only — never reject an existing password.
    password: str = Field(max_length=_MAX_PASSWORD_LEN)
