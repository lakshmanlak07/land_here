import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user_optional, require_pro, user_has_pro
from app.core.rate_limit import rate_limiter
from app.models.university import University
from app.models.user import User
from app.schemas.university import UniversityListItem, UniversityDetail

router = APIRouter(prefix="/universities", tags=["universities"])

_list_limit = rate_limiter("universities_list", limit=120, window_seconds=60)
# Free callers see the top 25 by LandHere Score. Applied to the SQL window, not
# to the serialised response, so the rows past 25 are never loaded, never sent,
# and cannot be recovered from the payload.
FREE_RANKING_ROWS = 25
# Responses now vary by entitlement, so they must never enter a shared cache.
_CACHE = "private, no-store"


@router.get("", response_model=list[UniversityListItem], dependencies=[Depends(_list_limit)])
def list_universities(
    response: Response,
    db: Session = Depends(get_db),
    search: str | None = Query(None, max_length=100, description="Filter by name (case-insensitive substring)"),
    max_tuition: int | None = Query(None, ge=0, le=1_000_000, description="Max international (out-of-state) tuition"),
    state: str | None = Query(None, max_length=50, description="Filter by state"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0, le=100_000),
    current_user: User | None = Depends(get_current_user_optional),
):
    response.headers["Cache-Control"] = _CACHE
    is_pro = user_has_pro(db, current_user)
    query = db.query(University).filter(University.has_full_score == True)

    if search:
        query = query.filter(University.name.ilike(f"%{search}%"))
    if max_tuition is not None:
        query = query.filter(University.tuition_out_of_state <= max_tuition)
    if state:
        query = query.filter(University.state.ilike(state))

    total = query.count()
    # Expose total so the client knows when all pages are loaded. Free callers
    # still get the true total: the count is what the upsell is selling, and it
    # leaks nothing about the withheld rows.
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count, X-Pro-Required"

    if not is_pro:
        if offset >= FREE_RANKING_ROWS:
            # Entirely past the free window — nothing to serve.
            response.headers["X-Pro-Required"] = "1"
            return []
        # Trim the page so it stops at the free boundary.
        limit = min(limit, FREE_RANKING_ROWS - offset)
        if total > FREE_RANKING_ROWS:
            response.headers["X-Pro-Required"] = "1"

    return (
        query.order_by(University.landhere_score.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get(
    "/{id}",
    response_model=UniversityDetail,
    # Full university detail is LandHere Pro. 401 signed out, 403 without a
    # purchase; the app turns the 403 into the paywall.
    dependencies=[Depends(require_pro)],
)
def get_university(id: uuid.UUID, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = _CACHE
    university = db.query(University).filter(University.id == id).first()
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    return university
