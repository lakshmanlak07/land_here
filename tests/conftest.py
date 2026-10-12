"""
Test configuration for LandHere backend.

IMPORTANT: This conftest must be the first thing pytest processes.
It sets DATABASE_URL to an in-memory SQLite database BEFORE any app
module is imported, so the real PostgreSQL database is never touched.

All tests run against a fresh in-memory SQLite database. Any data
created by tests (e.g. registered users) disappears when the test
session ends.
"""

import os

# Override database BEFORE any app.* imports. pydantic-settings v2
# gives environment variables priority over .env file values.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("SECRET_KEY", "test-only-secret-not-for-production")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# App imports come AFTER the env vars are set above.
import app.models.country  # noqa: F401 – registers table with Base.metadata
import app.models.user  # noqa: F401
import app.models.info_step  # noqa: F401
import app.models.country_guide  # noqa: F401
import app.models.refresh_token  # noqa: F401
import app.models.purchase  # noqa: F401
import app.models.password_reset  # noqa: F401
from app.core.database import Base, get_db
from app.main import app as fastapi_app

# Import seed data so tests use the same dataset as production.
from app.core.seed import COUNTRIES, IN_US_STEPS
from app.models.country import Country
from app.models.info_step import InfoStep

# ── SQLite in-memory engine ────────────────────────────────────────────────────
# StaticPool ensures all connections share the same underlying in-memory DB,
# so data inserted in one session is visible to others.
TEST_SQLITE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable foreign key enforcement in SQLite (off by default).
@event.listens_for(engine, "connect")
def _enable_fk(dbapi_conn, _record):
    dbapi_conn.execute("PRAGMA foreign_keys=ON")


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _fresh_rate_limits():
    """Clear the in-memory rate limiter before each test so hits accumulated by
    one test (all tests share one client IP) never 429 an unrelated test."""
    import app.core.rate_limit as _rl

    _rl._hits.clear()
    yield

@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once for the whole test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session", autouse=True)
def seed_test_data(create_tables):
    """Populate the test DB with the same countries and IN→US steps as production."""
    db = TestingSessionLocal()
    try:
        for country_data in COUNTRIES:
            db.add(Country(**country_data))
        db.commit()

        for step_data in IN_US_STEPS:
            db.add(InfoStep(origin_code="IN", destination_code="US", is_verified=False, **step_data))
        db.commit()
    finally:
        db.close()


@pytest.fixture(scope="session")
def client(create_tables, seed_test_data):
    """
    A TestClient with the real database dependency overridden to use SQLite.
    Shared across the entire test session for speed.
    """
    def _override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def paid_mode(monkeypatch):
    """Turn the (default-off) paywall and purchase processing back on.

    LandHere launches free: PAYWALL_ENABLED and PURCHASES_ENABLED default to
    False. The purchase/paywall suites still exercise the dormant paid path so
    it stays correct if it is ever re-enabled; they opt in with this fixture.
    """
    from app.core.config import settings

    monkeypatch.setattr(settings, "PAYWALL_ENABLED", True)
    monkeypatch.setattr(settings, "PURCHASES_ENABLED", True)
    yield
