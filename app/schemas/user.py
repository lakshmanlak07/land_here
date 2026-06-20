import uuid
from datetime import datetime
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


class UserRegister(BaseModel):
    email: NormalizedEmail
    password: str = Field(min_length=8, max_length=_MAX_PASSWORD_LEN)
    full_name: str | None = None
    origin_country_code: str | None = None
    destination_country_code: str | None = None


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

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AccountDeleteRequest(BaseModel):
    # Re-entering the password is the irreversible-action confirmation: deletion
    # must require proof of identity beyond merely possessing the token (e.g. an
    # unlocked, unattended device). Cap only — never reject an existing password.
    password: str = Field(max_length=_MAX_PASSWORD_LEN)
