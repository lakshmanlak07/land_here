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
    # Phases withheld because the caller does not own LandHere Pro. Names only —
    # never the steps themselves, which is the whole point of the gate. The app
    # renders these as locked rows above the upsell.
    locked_phases: list[str] = []
    pro_required: bool = False


class CorridorOut(BaseModel):
    origin_code: str | None
    destination_code: str
