"""Migration safety check against a DISPOSABLE PostgreSQL database.

    python scripts/check_migrations.py [admin_database_url]

Creates `landhere_migcheck` on the server named by the admin URL (default: the
DATABASE_URL in .env with its database swapped for `postgres`), boots two
instances at once (app.core.boot; no duplicate journey steps), then runs
upgrade head -> seed x2 -> university dataset load x2 (both must be
idempotent) -> downgrade base ->
upgrade head -> alembic check (no model/migration drift), and drops the
scratch database. Never touches any other database.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys

import psycopg2
from dotenv import dotenv_values

SCRATCH = "landhere_migcheck"


def main() -> int:
    admin = sys.argv[1] if len(sys.argv) > 1 else None
    if admin is None:
        base = os.environ.get("DATABASE_URL") or dotenv_values(".env").get("DATABASE_URL")
        if not base:
            print("No DATABASE_URL; pass an admin URL.")
            return 2
        admin = re.sub(r"/[^/?]+(\?.*)?$", "/postgres", base)
    scratch_url = re.sub(r"/[^/?]+(\?.*)?$", f"/{SCRATCH}", admin)

    conn = psycopg2.connect(admin)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(f"DROP DATABASE IF EXISTS {SCRATCH}")
    cur.execute(f"CREATE DATABASE {SCRATCH}")
    env = dict(os.environ, DATABASE_URL=scratch_url, PYTHONIOENCODING="utf-8")
    steps = [
        ["-m", "alembic", "upgrade", "head"],
        ["-m", "app.core.seed"],
        ["-m", "app.core.seed"],
        ["-m", "app.core.universities_dataset", "load"],
        ["-m", "app.core.universities_dataset", "load"],
        ["-m", "alembic", "downgrade", "base"],
        ["-m", "alembic", "upgrade", "head"],
        ["-m", "alembic", "check"],
    ]
    ok = True
    try:
        # Two instances booting at once on the empty database (deploy overlap).
        # Both must succeed and the journey steps must not be duplicated.
        boots = [
            subprocess.Popen([sys.executable, "-m", "app.core.boot"], env=env,
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for _ in range(2)
        ]
        outs = [b.communicate()[0] for b in boots]
        sc = psycopg2.connect(scratch_url)
        with sc, sc.cursor() as c:
            c.execute(
                "SELECT count(*) FROM (SELECT 1 FROM info_steps GROUP BY origin_code, "
                "destination_code, phase, step_number HAVING count(*) > 1) d"
            )
            dupes = c.fetchone()[0]
        sc.close()
        if any(b.returncode for b in boots) or dupes:
            print(f"FAIL  concurrent boot x2 (exit codes {[b.returncode for b in boots]}, duplicate steps {dupes})")
            for o in outs:
                print("      " + "\n      ".join(o.strip().splitlines()[-3:]))
            return 1
        print("PASS  concurrent boot x2 (no duplicate journey steps)")

        for args in steps:
            r = subprocess.run([sys.executable, *args], env=env, capture_output=True, text=True)
            label = " ".join(args[1:])
            if r.returncode != 0:
                ok = False
                tail = (r.stdout + r.stderr).strip().splitlines()[-3:]
                print(f"FAIL  {label}\n      " + "\n      ".join(tail))
                break
            print(f"PASS  {label}")
            if "inserted" in r.stdout:
                print("      " + " | ".join(l for l in r.stdout.splitlines() if "inserted" in l))
    finally:
        cur.execute(f"DROP DATABASE IF EXISTS {SCRATCH}")
        conn.close()
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
