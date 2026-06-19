import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# Upper bound guards against very long inputs (bcrypt work scales with length;
# it also only uses the first 72 bytes, so longer is pointless). The mobile app
# already enforces an 8-char minimum on registration.
_MAX_PASSWORD_LEN = 128


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=_MAX_PASSWORD_LEN)
    full_name: str | None = None
    origin_country_code: str | None = None
    destination_country_code: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
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
