from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.country import Country
from app.schemas.country import CountryOut

router = APIRouter(prefix="/countries", tags=["countries"])

# Country data is reference data that changes only when a new corridor is added.
_CACHE = "public, max-age=3600"


@router.get("", response_model=list[CountryOut])
def list_countries(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = _CACHE
    return db.query(Country).order_by(Country.name).all()


@router.get("/destinations", response_model=list[CountryOut])
def list_destinations(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = _CACHE
    return db.query(Country).filter(Country.is_destination == True).order_by(Country.name).all()


@router.get("/origins", response_model=list[CountryOut])
def list_origins(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = _CACHE
    return db.query(Country).filter(Country.is_origin == True).order_by(Country.name).all()


@router.get("/{code}", response_model=CountryOut)
def get_country(code: str, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = _CACHE
    country = db.query(Country).filter(Country.code == code.upper()).first()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return country
