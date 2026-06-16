import uuid
from pydantic import BaseModel


class CountryOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    student_visa_name: str | None
    official_immigration_url: str | None
    currency_code: str | None
    is_destination: bool
    is_origin: bool

    model_config = {"from_attributes": True}
