import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.university import University
from app.schemas.university import UniversityListItem, UniversityDetail

router = APIRouter(prefix="/universities", tags=["universities"])


@router.get("", response_model=list[UniversityListItem])
def list_universities(
    db: Session = Depends(get_db),
    search: str | None = Query(None, max_length=100, description="Filter by name (case-insensitive substring)"),
    max_tuition: int | None = Query(None, ge=0, le=1_000_000, description="Max international (out-of-state) tuition"),
    state: str | None = Query(None, max_length=50, description="Filter by state"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0, le=100_000),
):
    query = db.query(University).filter(University.has_full_score == True)

    if search:
        query = query.filter(University.name.ilike(f"%{search}%"))
    if max_tuition is not None:
        query = query.filter(University.tuition_out_of_state <= max_tuition)
    if state:
        query = query.filter(University.state.ilike(state))

    return (
        query.order_by(University.landhere_score.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/{id}", response_model=UniversityDetail)
def get_university(id: uuid.UUID, db: Session = Depends(get_db)):
    university = db.query(University).filter(University.id == id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    return university
