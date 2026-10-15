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


async def get_db():
    """Request-scoped session.

    Deliberately an *async* generator even though the session is sync: FastAPI
    runs sync generator dependencies' setup and teardown in the thread pool, so
    under load a finished request could not return its connection (close) until
    a thread was free, while every thread was blocked waiting for a connection -
    a deadlock broken only by the pool timeout. Measured with
    scripts/load_test.py at 150 concurrent users. Creating and closing the
    session on the event loop needs no thread, so connections are always
    returned promptly. Handlers still run the queries in the thread pool.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
