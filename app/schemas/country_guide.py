import uuid
from pydantic import BaseModel


class CountryGuideOut(BaseModel):
    id: uuid.UUID
    country_code: str
    section: str
    title: str
    content: str
    official_source_url: str | None
    is_verified: bool

    model_config = {"from_attributes": True}
