from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.country_guide import CountryGuide
from app.schemas.country_guide import CountryGuideOut

router = APIRouter(prefix="/guides", tags=["guides"])


@router.get("/{country_code}", response_model=list[CountryGuideOut])
def get_guides(
    country_code: str,
    section: str | None = Query(None, description="Filter by section, e.g. banking"),
    db: Session = Depends(get_db),
):
    country_code = country_code.upper()
    q = db.query(CountryGuide).filter(CountryGuide.country_code == country_code)
    if section:
        q = q.filter(CountryGuide.section == section.lower())
    results = q.order_by(CountryGuide.section).all()
    if not results and section is None:
        raise HTTPException(status_code=404, detail="No guides found for this country")
    return results
