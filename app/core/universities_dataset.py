"""
Export / load the university rankings dataset as a versioned JSON file.

Production does not need the Scorecard/OpenAlex API keys or a live ingest:
the scored dataset is committed at data/universities.json and loaded with

    python -m app.core.universities_dataset load [path]

Loading is an idempotent upsert keyed on `scorecard_id` (the College Scorecard
unit id): running it twice changes nothing; rows are never deleted.

To refresh the dataset: run the ingest pipeline locally
(ingest_scorecard -> ingest_openalex -> compute_scores), then

    python -m app.core.universities_dataset export [path]

and commit the new file.

Sources: U.S. Department of Education College Scorecard (public domain) and
OpenAlex (CC0). See data/README.md.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

from app.core.database import SessionLocal
from app.models.university import University

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "universities.json"

FIELDS = [
    "scorecard_id", "openalex_id", "ror_id", "name", "country_code", "state",
    "official_url", "avg_net_price", "tuition_out_of_state", "median_earnings_10yr",
    "completion_rate", "median_debt", "intl_student_pct", "citations_total",
    "works_count", "mean_citedness", "research_score", "outcomes_score",
    "landhere_score", "has_full_score", "last_refreshed", "match_confidence",
]


def _encode(value):
    return value.isoformat() if isinstance(value, datetime) else value


def export(path: Path = DEFAULT_PATH) -> int:
    db = SessionLocal()
    try:
        rows = db.query(University).order_by(University.scorecard_id).all()
        payload = {
            "schema": 1,
            "count": len(rows),
            "scored": sum(1 for r in rows if r.has_full_score),
            "universities": [{f: _encode(getattr(r, f)) for f in FIELDS} for r in rows],
        }
    finally:
        db.close()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[universities] exported {payload['count']} ({payload['scored']} scored) -> {path}")
    return payload["count"]


def load(path: Path = DEFAULT_PATH) -> tuple[int, int]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema") != 1:
        raise SystemExit(f"Unsupported dataset schema: {data.get('schema')!r}")
    db = SessionLocal()
    inserted = updated = 0
    try:
        existing = {u.scorecard_id: u for u in db.query(University).all()}
        for item in data["universities"]:
            values = {f: item.get(f) for f in FIELDS}
            if values["last_refreshed"]:
                values["last_refreshed"] = datetime.fromisoformat(values["last_refreshed"])
            row = existing.get(values["scorecard_id"])
            if row is None:
                db.add(University(**values))
                inserted += 1
                continue
            changed = False
            for f, v in values.items():
                if getattr(row, f) != v:
                    setattr(row, f, v)
                    changed = True
            updated += changed
        db.commit()
    finally:
        db.close()
    print(f"[universities] {inserted} inserted, {updated} updated from {path}")
    return inserted, updated


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_PATH
    if cmd == "export":
        export(target)
    elif cmd == "load":
        load(target)
    else:
        raise SystemExit("usage: python -m app.core.universities_dataset {export|load} [path]")
