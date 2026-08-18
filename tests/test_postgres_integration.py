"""
Integration tests against a real PostgreSQL database.

The rest of the suite runs on in-memory SQLite, which is fast and isolated but
is not the database we ship on, and differs in exactly the places that matter
for the purchase path:

  * SQLite via StaticPool shares ONE connection across threads, so genuine
    concurrency cannot be tested there. An earlier attempt produced
    `sqlite3.InterfaceError: bad parameter or other API misuse` and passed or
    failed on timing.
  * SQLite does not persist timezone offsets for DateTime(timezone=True), so
    the notification-ordering comparison behaves differently.
  * SQLite needs `PRAGMA foreign_keys=ON` before it enforces a cascade at all;
    PostgreSQL enforces it natively. The deletion promise rests on that cascade.

So the race the SQLite suite *simulates* is executed here for real: several
concurrent connections, real transactions, the real UNIQUE constraint.

Skipped automatically when no PostgreSQL is reachable, so the default suite
still runs anywhere. Point INTEGRATION_DATABASE_URL at a scratch database, or
let it derive one from the project's DATABASE_URL.
"""

from __future__ import annotations

import concurrent.futures
import os
import re
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import sessionmaker

pytestmark = pytest.mark.integration

DEFAULT_SCRATCH_DB = "land_here_integration"


def _db_name(url: str) -> str:
    """The database a URL points at.

    Derived from the URL rather than taken from a constant. An earlier version
    created the database named by a module constant and then connected to the
    one named in INTEGRATION_DATABASE_URL — which silently worked only while
    the two happened to agree, and failed on any machine where the scratch
    database did not already exist.
    """
    return url.rstrip("/").rsplit("/", 1)[-1].split("?")[0]


def _scratch_url() -> str | None:
    """A URL for a scratch database, or None if PostgreSQL is unreachable."""
    explicit = os.environ.get("INTEGRATION_DATABASE_URL")
    if explicit:
        return explicit
    base = os.environ.get("LANDHERE_DATABASE_URL")
    if not base:
        try:
            from dotenv import dotenv_values

            root = os.path.join(os.path.dirname(__file__), "..", ".env")
            base = (dotenv_values(root) or {}).get("DATABASE_URL")
        except Exception:
            base = None
    if not base or not base.startswith("postgresql"):
        return None
    return re.sub(r"/[^/]+$", f"/{DEFAULT_SCRATCH_DB}", base)


@pytest.fixture(scope="module")
def pg_engine():
    url = _scratch_url()
    if url is None:
        pytest.skip("no PostgreSQL available (set INTEGRATION_DATABASE_URL)")

    scratch_db = _db_name(url)
    if not re.fullmatch(r"[A-Za-z0-9_]+", scratch_db):
        pytest.skip(f"unsafe scratch database name: {scratch_db!r}")
    admin_url = re.sub(r"/[^/]+$", "/postgres", url)
    try:
        admin = create_engine(admin_url, isolation_level="AUTOCOMMIT")
        with admin.connect() as c:
            c.execute(text(f"DROP DATABASE IF EXISTS {scratch_db} WITH (FORCE)"))
            c.execute(text(f"CREATE DATABASE {scratch_db}"))
            created = c.execute(
                text("select count(*) from pg_database where datname = :n"),
                {"n": scratch_db},
            ).scalar()
        admin.dispose()
    except OperationalError as exc:
        pytest.skip(f"PostgreSQL not reachable: {str(exc)[:80]}")
    # Fail loudly here rather than as an obscure "database does not exist" from
    # create_all several lines later.
    assert created == 1, f"scratch database {scratch_db} was not created"

    # Schema from the models rather than from Alembic: the migration chain is
    # verified separately, and this keeps these tests about runtime behaviour.
    import app.models.country  # noqa: F401
    import app.models.country_guide  # noqa: F401
    import app.models.info_step  # noqa: F401
    import app.models.purchase  # noqa: F401
    import app.models.refresh_token  # noqa: F401
    import app.models.university  # noqa: F401
    import app.models.user  # noqa: F401
    from app.core.database import Base

    engine = create_engine(url, pool_size=10, max_overflow=10)
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()

    admin = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as c:
        c.execute(text(f"DROP DATABASE IF EXISTS {scratch_db} WITH (FORCE)"))
    admin.dispose()


@pytest.fixture
def Session(pg_engine):
    return sessionmaker(bind=pg_engine, autocommit=False, autoflush=False)


def _make_user(Session) -> uuid.UUID:
    from app.models.user import User

    db = Session()
    try:
        u = User(
            id=uuid.uuid4(),
            email=f"pg_{uuid.uuid4().hex[:10]}@landhere-tests.example.com",
            hashed_password="x" * 60,
        )
        db.add(u)
        db.commit()
        return u.id
    finally:
        db.close()


def _insert_purchase(Session, user_id, token, platform="ios"):
    """One racing writer: read-then-insert, exactly as the route does."""
    from app.models.purchase import Purchase

    db = Session()
    try:
        existing = (
            db.query(Purchase)
            .filter(
                Purchase.platform == platform,
                Purchase.platform_transaction_id == token,
            )
            .first()
        )
        if existing is not None:
            return "found-existing"
        db.add(
            Purchase(
                id=uuid.uuid4(),
                user_id=user_id,
                platform=platform,
                platform_transaction_id=token,
                transaction_id="t1",
                product_id="com.landhere.app.pro",
                environment="Production",
                purchased_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
        return "inserted"
    except IntegrityError:
        db.rollback()
        return "integrity-error"
    finally:
        db.close()


def test_the_unique_constraint_actually_exists_in_postgres(pg_engine):
    """The entitlement model IS this constraint. Prove PostgreSQL has it."""
    with pg_engine.connect() as c:
        rows = list(
            c.execute(
                text(
                    "select constraint_name from information_schema.table_constraints "
                    "where table_name='purchases' and constraint_type='UNIQUE'"
                )
            )
        )
    names = {r[0] for r in rows}
    assert "uq_purchases_platform_txn" in names, names


def test_concurrent_inserts_of_one_purchase_leave_exactly_one_row(Session):
    """The real race, on real connections.

    Eight threads, eight connections, one purchase token. PostgreSQL must let
    exactly one INSERT win; the losers either see IntegrityError (which the
    route recovers from) or find the winner's row. Two rows must never exist.
    """
    from app.models.purchase import Purchase

    user_id = _make_user(Session)
    token = f"race-{uuid.uuid4().hex}"

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        outcomes = list(
            pool.map(lambda _: _insert_purchase(Session, user_id, token), range(8))
        )

    db = Session()
    try:
        rows = (
            db.query(Purchase)
            .filter(Purchase.platform_transaction_id == token)
            .count()
        )
    finally:
        db.close()

    assert rows == 1, f"{rows} rows survived; outcomes={outcomes}"
    assert outcomes.count("inserted") == 1, outcomes
    assert set(outcomes) <= {"inserted", "found-existing", "integrity-error"}, outcomes


def test_a_second_account_cannot_take_the_same_purchase_under_concurrency(Session):
    """One purchase, one account — enforced by the database, not by a check."""
    from app.models.purchase import Purchase

    user_a = _make_user(Session)
    user_b = _make_user(Session)
    token = f"crossrace-{uuid.uuid4().hex}"

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = [
            pool.submit(
                _insert_purchase, Session, user_a if i % 2 == 0 else user_b, token
            )
            for i in range(8)
        ]
        for f in futures:
            f.result()

    db = Session()
    try:
        owners = {
            r.user_id
            for r in db.query(Purchase).filter(
                Purchase.platform_transaction_id == token
            )
        }
    finally:
        db.close()
    assert len(owners) == 1, f"the purchase is linked to {len(owners)} accounts"


def test_the_same_token_on_two_platforms_is_two_purchases(Session):
    """Uniqueness is scoped per platform, so the namespaces cannot collide."""
    from app.models.purchase import Purchase

    user_id = _make_user(Session)
    token = f"shared-{uuid.uuid4().hex}"

    assert _insert_purchase(Session, user_id, token, platform="ios") == "inserted"
    assert _insert_purchase(Session, user_id, token, platform="android") == "inserted"

    db = Session()
    try:
        count = (
            db.query(Purchase)
            .filter(Purchase.platform_transaction_id == token)
            .count()
        )
    finally:
        db.close()
    assert count == 2


def test_deleting_a_user_cascades_to_purchases_in_postgres(Session):
    """The deletion promise depends on this cascade.

    SQLite only enforces it with PRAGMA foreign_keys=ON, which conftest sets —
    so the SQLite suite proves the pragma works. This proves the real engine
    does it natively.
    """
    from app.models.purchase import Purchase
    from app.models.user import User

    user_id = _make_user(Session)
    token = f"cascade-{uuid.uuid4().hex}"
    assert _insert_purchase(Session, user_id, token) == "inserted"

    db = Session()
    try:
        db.query(User).filter(User.id == user_id).delete()
        db.commit()
        remaining = (
            db.query(Purchase)
            .filter(Purchase.platform_transaction_id == token)
            .count()
        )
    finally:
        db.close()
    assert remaining == 0, "purchases survived their user"


def test_timezone_offsets_survive_a_round_trip_in_postgres(Session):
    """The notification-ordering comparison depends on this.

    SQLite drops offsets for DateTime(timezone=True) and returns naive values,
    which is why the ordering code normalises explicitly. PostgreSQL returns
    aware values — so across the two suites both branches of that normalisation
    are exercised rather than only one.
    """
    from app.models.purchase import Purchase

    user_id = _make_user(Session)
    token = f"tz-{uuid.uuid4().hex}"
    stamp = datetime.now(timezone.utc) - timedelta(hours=3)

    db = Session()
    try:
        db.add(
            Purchase(
                id=uuid.uuid4(),
                user_id=user_id,
                platform="ios",
                platform_transaction_id=token,
                transaction_id="t1",
                product_id="com.landhere.app.pro",
                environment="Production",
                purchased_at=datetime.now(timezone.utc),
                last_event_signed_at=stamp,
            )
        )
        db.commit()
    finally:
        db.close()

    db = Session()
    try:
        row = (
            db.query(Purchase)
            .filter(Purchase.platform_transaction_id == token)
            .one()
        )
        assert row.last_event_signed_at is not None
        assert row.last_event_signed_at.tzinfo is not None, "PostgreSQL lost the offset"
        # And the comparison the ordering logic performs must not raise.
        assert row.last_event_signed_at < datetime.now(timezone.utc)
    finally:
        db.close()
