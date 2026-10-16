"""
Boot-time database setup, serialized across instances.

    python -m app.core.boot

start.sh runs this on every container start: migrations, then (unless
LOAD_REFERENCE_DATA=false) the reference-data seed and the university dataset
load, then a purge of expired auth tokens.

Two instances booting together (a deploy overlap, a scale-up, a restart during a
deploy) used to race: duplicate DDL crashed one of them, and the check-then-
insert seed could insert every journey step twice. A PostgreSQL session-level
advisory lock now makes the second instance wait for the first, then find
nothing left to do. Each step still runs as its own process, exactly as before.
"""

from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime, timezone

from sqlalchemy import create_engine, pool, text

from app.core.config import settings

# Arbitrary, fixed, and unique to this app's boot sequence. A session-level
# advisory lock needs a direct connection: through a transaction-mode pooler
# (PgBouncer, Supabase/Neon pooler URLs) it silently does nothing, leaving only
# the info_steps unique constraint as a backstop. Render's internal URL is direct.
BOOT_LOCK_ID = 7_274_001


def _steps(load_reference_data: bool) -> list[list[str]]:
    steps = [[sys.executable, "-m", "alembic", "upgrade", "head"]]
    if load_reference_data:
        steps += [
            [sys.executable, "-m", "app.core.seed"],
            [sys.executable, "-m", "app.core.universities_dataset", "load"],
        ]
    return steps


def purge_expired_tokens(conn) -> tuple[int, int]:
    """Delete refresh and password-reset tokens past their expiry.

    An expired refresh token is already rejected by its JWT `exp` before any
    row lookup, so its row is dead weight; nothing else reads it.
    """
    now = datetime.now(timezone.utc)
    refresh = conn.execute(text("DELETE FROM refresh_tokens WHERE expires_at < :now"), {"now": now})
    reset = conn.execute(text("DELETE FROM password_reset_tokens WHERE expires_at < :now"), {"now": now})
    conn.commit()
    return refresh.rowcount, reset.rowcount


def main() -> int:
    load_reference_data = os.environ.get("LOAD_REFERENCE_DATA", "true").lower() == "true"
    engine = create_engine(settings.DATABASE_URL, poolclass=pool.NullPool)
    with engine.connect() as conn:
        is_pg = conn.dialect.name == "postgresql"
        if is_pg:
            print("[boot] waiting for the boot lock...", flush=True)
            conn.execute(text("SELECT pg_advisory_lock(:k)"), {"k": BOOT_LOCK_ID})
            conn.commit()  # the session-level lock outlives the transaction
        try:
            for cmd in _steps(load_reference_data):
                subprocess.run(cmd, check=True)
            try:
                refresh, reset = purge_expired_tokens(conn)
                print(f"[boot] purged {refresh} expired refresh tokens, {reset} expired reset tokens.")
            except Exception as exc:  # housekeeping only: never fail the boot over it
                print(f"[boot] token purge skipped: {type(exc).__name__}", file=sys.stderr)
        finally:
            if is_pg:
                try:
                    conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": BOOT_LOCK_ID})
                    conn.commit()
                except Exception:
                    pass  # a dropped connection has already released the lock
    return 0


if __name__ == "__main__":
    sys.exit(main())
