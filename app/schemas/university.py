import uuid
from pydantic import BaseModel


class UniversityListItem(BaseModel):
    """Summary row for the ranked list."""
    id: uuid.UUID
    name: str
    state: str | None
    landhere_score: float | None
    tuition_out_of_state: int | None
    avg_net_price: int | None
    median_earnings_10yr: int | None

    model_config = {"from_attributes": True}


class UniversityDetail(BaseModel):
    """Full detail incl. score breakdown + underlying raw numbers."""
    id: uuid.UUID
    name: str
    state: str | None
    official_url: str | None

    landhere_score: float | None
    research_score: float | None
    outcomes_score: float | None

    avg_net_price: int | None
    tuition_out_of_state: int | None
    median_earnings_10yr: int | None
    completion_rate: float | None
    citations_total: int | None
    works_count: int | None

    model_config = {"from_attributes": True}
