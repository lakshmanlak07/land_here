from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.country import Country
from app.schemas.country import CountryOut

router = APIRouter(prefix="/countries", tags=["countries"])


@router.get("", response_model=list[CountryOut])
def list_countries(db: Session = Depends(get_db)):
    return db.query(Country).order_by(Country.name).all()


@router.get("/destinations", response_model=list[CountryOut])
def list_destinations(db: Session = Depends(get_db)):
    return db.query(Country).filter(Country.is_destination == True).order_by(Country.name).all()


@router.get("/origins", response_model=list[CountryOut])
def list_origins(db: Session = Depends(get_db)):
    return db.query(Country).filter(Country.is_origin == True).order_by(Country.name).all()


@router.get("/{code}", response_model=CountryOut)
def get_country(code: str, db: Session = Depends(get_db)):
    country = db.query(Country).filter(Country.code == code.upper()).first()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return country
