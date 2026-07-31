import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import rate_limiter
from app.models.university import University
from app.schemas.university import UniversityListItem, UniversityDetail

router = APIRouter(prefix="/universities", tags=["universities"])

_list_limit = rate_limiter("universities_list", limit=120, window_seconds=60)
_CACHE = "public, max-age=3600"


@router.get("", response_model=list[UniversityListItem], dependencies=[Depends(_list_limit)])
def list_universities(
    response: Response,
    db: Session = Depends(get_db),
    search: str | None = Query(None, description="Filter by name (case-insensitive substring)"),
    max_tuition: int | None = Query(None, ge=0, description="Max international tuition"),
    state: str | None = Query(None, description="Filter by state"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    response.headers["Cache-Control"] = _CACHE
    query = db.query(University).filter(University.has_full_score == True)

    if search:
        query = query.filter(University.name.ilike(f"%{search}%"))
    if max_tuition is not None:
        query = query.filter(University.tuition_out_of_state <= max_tuition)
    if state:
        query = query.filter(University.state.ilike(state))

    total = query.count()
    # Expose total so the client knows when all pages are loaded.
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    return (
        query.order_by(University.landhere_score.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/{id}", response_model=UniversityDetail)
def get_university(id: uuid.UUID, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = _CACHE
    university = db.query(University).filter(University.id == id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    return university
