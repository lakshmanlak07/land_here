import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user_optional, require_pro, content_unlocked
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
# 85 of the 267 scored rows share a score with another row. Without the id
# tiebreaker PostgreSQL may order ties differently per query, so offset pages
# skip and repeat rows (and the free top 25 is not a fixed set).
_RANK_ORDER = (University.landhere_score.desc().nulls_last(), University.id)


def _escape_like(term: str) -> str:
    """Make % and _ in user input literal in an ILIKE pattern."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


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
    is_pro = content_unlocked(db, current_user)
    scored = db.query(University).filter(University.has_full_score == True)

    # The true, unfiltered population — what the upsell is selling. Safe to
    # expose: a count leaks nothing about the withheld rows.
    total = scored.count()
    response.headers["X-Total-Count"] = str(total)
    response.headers["Access-Control-Expose-Headers"] = "X-Total-Count, X-Pro-Required"

    query = scored
    if not is_pro:
        # Restrict to the GLOBAL top 25 *before* the caller's filters apply.
        #
        # Capping the paginated window instead — which is what this did
        # originally — caps the filtered result set, not the ranking. A free
        # caller could then reach any school in the table with ?search=,
        # ?state= or ?max_tuition=, since each filter produces its own "top 25".
        # Iterating filters enumerated the whole list. The free tier is the top
        # 25 *universities*, not the top 25 of any query the caller invents.
        top_ids = (
            select(University.id)
            .where(University.has_full_score == True)
            .order_by(*_RANK_ORDER)
            .limit(FREE_RANKING_ROWS)
        )
        query = query.filter(University.id.in_(top_ids))
        if total > FREE_RANKING_ROWS:
            response.headers["X-Pro-Required"] = "1"

    if search:
        query = query.filter(University.name.ilike(f"%{_escape_like(search)}%", escape="\\"))
    if max_tuition is not None:
        query = query.filter(University.tuition_out_of_state <= max_tuition)
    if state:
        query = query.filter(University.state.ilike(_escape_like(state), escape="\\"))

    if not is_pro and offset >= FREE_RANKING_ROWS:
        return []

    return (
        query.order_by(*_RANK_ORDER)
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
