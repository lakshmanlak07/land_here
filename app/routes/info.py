from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, distinct

from app.core.database import get_db
from app.models.info_step import InfoStep, VALID_PHASES
from app.schemas.info_step import JourneyOut, PhaseGroup, InfoStepOut, CorridorOut

router = APIRouter(prefix="/info", tags=["info"])

PHASE_ORDER = list(VALID_PHASES)


@router.get("/phases")
def list_phases():
    return {"phases": PHASE_ORDER}


@router.get("/corridors", response_model=list[CorridorOut])
def list_corridors(db: Session = Depends(get_db)):
    rows = (
        db.execute(
            select(InfoStep.origin_code, InfoStep.destination_code).distinct()
        )
        .all()
    )
    return [CorridorOut(origin_code=r.origin_code, destination_code=r.destination_code) for r in rows]


@router.get("/journey", response_model=JourneyOut)
def get_journey(
    destination: str = Query(..., description="ISO country code, e.g. US"),
    origin: str | None = Query(None, description="ISO country code, e.g. IN"),
    db: Session = Depends(get_db),
):
    destination = destination.upper()
    origin = origin.upper() if origin else None

    q = db.query(InfoStep).filter(InfoStep.destination_code == destination)
    if origin:
        q = q.filter(
            (InfoStep.origin_code == origin) | (InfoStep.origin_code == None)
        )
    steps = q.order_by(InfoStep.step_number).all()

    if not steps:
        raise HTTPException(status_code=404, detail="No journey content found for this corridor")

    phase_map: dict[str, list[InfoStepOut]] = {p: [] for p in PHASE_ORDER}
    for step in steps:
        if step.phase in phase_map:
            phase_map[step.phase].append(InfoStepOut.model_validate(step))

    phases = [
        PhaseGroup(phase=p, steps=phase_map[p])
        for p in PHASE_ORDER
        if phase_map[p]
    ]

    return JourneyOut(origin=origin, destination=destination, phases=phases)
