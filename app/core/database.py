from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings


def _engine_kwargs(url: str) -> dict:
    """Pool settings for PostgreSQL. SQLite (tests) keeps SQLAlchemy defaults.

    pool_pre_ping drops connections the server or a proxy closed while idle
    (common on managed Postgres) instead of failing the next request.
    Total connections per process = DB_POOL_SIZE + DB_MAX_OVERFLOW; keep
    (workers x that) below the database plan's connection limit.
    """
    if not url.startswith("postgresql"):
        return {}
    return {
        "pool_pre_ping": True,
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_recycle": 1800,
        "pool_timeout": 10,
    }


engine = create_engine(settings.DATABASE_URL, **_engine_kwargs(settings.DATABASE_URL))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
