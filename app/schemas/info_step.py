import uuid
from pydantic import BaseModel


class InfoStepOut(BaseModel):
    id: uuid.UUID
    origin_code: str | None
    destination_code: str
    phase: str
    step_number: int
    title: str
    explanation: str
    official_source_name: str
    official_source_url: str
    is_verified: bool

    model_config = {"from_attributes": True}


class PhaseGroup(BaseModel):
    phase: str
    steps: list[InfoStepOut]


class JourneyOut(BaseModel):
    origin: str | None
    destination: str
    phases: list[PhaseGroup]


class CorridorOut(BaseModel):
    origin_code: str | None
    destination_code: str
