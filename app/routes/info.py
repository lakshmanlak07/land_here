from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user_optional, user_has_pro
from app.core.rate_limit import rate_limiter
from app.models.info_step import InfoStep, VALID_PHASES
from app.models.user import User
from app.schemas.info_step import JourneyOut, PhaseGroup, CorridorOut

router = APIRouter(prefix="/info", tags=["info"])

PHASE_ORDER = list(VALID_PHASES)

# The free tier is the first two phases — deciding where to study and what to do
# once you are accepted. Everything from the visa onward is LandHere Pro.
# Enforced here, on the server: the app never receives the locked steps, so
# reading them out of the response, the bundle, or the on-device cache is not a
# route around the gate.
FREE_PHASES = PHASE_ORDER[:2]

# Prevent bulk scraping of journey content. Generous enough for any real user
# workflow (a user visits a corridor at most a handful of times per session).
_journey_limit = rate_limiter("info_journey", limit=120, window_seconds=60)


@router.get("/phases")
async def list_phases(response: Response):
    """Phase list is static — cache aggressively."""
    response.headers["Cache-Control"] = "public, max-age=86400"
    return {"phases": PHASE_ORDER}


@router.get("/corridors", response_model=list[CorridorOut])
def list_corridors(response: Response, db: Session = Depends(get_db)):
    """List distinct (origin, destination) corridor pairs that have steps."""
    response.headers["Cache-Control"] = "public, max-age=3600"
    rows = (
        db.execute(
            select(InfoStep.origin_code, InfoStep.destination_code).distinct()
        )
        .all()
    )
    return [CorridorOut(origin_code=r.origin_code, destination_code=r.destination_code) for r in rows]


@router.get("/journey", response_model=JourneyOut, dependencies=[Depends(_journey_limit)])
def get_journey(
    response: Response,
    destination: str = Query(..., description="ISO country code, e.g. US"),
    origin: str | None = Query(None, description="ISO country code, e.g. IN"),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    # Was "public, max-age=3600". The body now differs between a free and a Pro
    # caller, so a shared cache would eventually hand a Pro response to a free
    # user. Private-only, and revalidated.
    response.headers["Cache-Control"] = "private, no-store"
    is_pro = user_has_pro(db, current_user)
    destination = destination.upper()
    origin = origin.upper() if origin else None

    q = db.query(InfoStep).filter(InfoStep.destination_code == destination)
    if origin:
        q = q.filter(
            (InfoStep.origin_code.is_(None)) | (InfoStep.origin_code == origin)
        )
    else:
        q = q.filter(InfoStep.origin_code.is_(None))

    steps = q.order_by(InfoStep.phase, InfoStep.step_number).all()

    groups: dict[str, list] = {}
    for step in steps:
        groups.setdefault(step.phase, []).append(step)

    phases = [
        PhaseGroup(phase=phase, steps=phase_steps)
        for phase, phase_steps in groups.items()
    ]
    # Re-sort by PHASE_ORDER so phases appear in chronological order.
    # The DB query sorts alphabetically by phase string, which gives the wrong
    # sequence for our phase names (after_arrival comes before visa_process).
    _phase_index = {p: i for i, p in enumerate(PHASE_ORDER)}
    phases.sort(key=lambda pg: _phase_index.get(pg.phase, 99))

    locked_phases: list[str] = []
    if not is_pro:
        locked_phases = [pg.phase for pg in phases if pg.phase not in FREE_PHASES]
        phases = [pg for pg in phases if pg.phase in FREE_PHASES]

    return JourneyOut(
        origin=origin,
        destination=destination,
        phases=phases,
        locked_phases=locked_phases,
        pro_required=bool(locked_phases),
    )
