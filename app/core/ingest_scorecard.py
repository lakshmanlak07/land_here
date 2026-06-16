"""
Fetch ~500 largest US 4-year universities from the College Scorecard API
and upsert them into the universities table.

Run with:
    python -m app.core.ingest_scorecard
"""

import json
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import urlopen

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.university import University

SCORECARD_URL = "https://api.data.gov/ed/collegescorecard/v1/schools"
PER_PAGE = 100
TARGET = 500

# Flat dotted-path field names as returned by the API
_F_NAME        = "school.name"
_F_STATE       = "school.state"
_F_URL         = "school.school_url"
_F_NET_PRICE   = "latest.cost.avg_net_price.overall"
_F_TUITION     = "latest.cost.tuition.out_of_state"
_F_EARNINGS    = "latest.earnings.10_yrs_after_entry.median"
_F_COMPLETION  = "latest.completion.completion_rate_4yr_150nt"
_F_DEBT        = "latest.aid.median_debt.completers.overall"
_F_INTL        = "latest.student.demographics.race_ethnicity.non_resident_alien"

_FIELDS = ",".join([
    "id",
    _F_NAME, _F_STATE, _F_URL,
    _F_NET_PRICE, _F_TUITION, _F_EARNINGS, _F_COMPLETION, _F_DEBT,
    _F_INTL,
    "latest.student.size",
])

_BASE_PARAMS: dict = {
    "api_key": settings.SCORECARD_API_KEY,
    "school.degrees_awarded.predominant": 3,  # predominantly bachelor's
    "school.operating": 1,
    "per_page": PER_PAGE,
    "_sort": "latest.student.size:desc",
    "fields": _FIELDS,
}


def _int(val):
    try:
        return int(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def _float(val):
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def _fetch_page(page: int) -> list[dict]:
    params = {**_BASE_PARAMS, "page": page}
    url = f"{SCORECARD_URL}?{urlencode(params)}"
    try:
        with urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read())
    except HTTPError as exc:
        print(f"  HTTP {exc.code} on page {page}: {exc.read()[:300]}")
        return []
    return data.get("results", [])


def _to_row(inst: dict) -> dict:
    return {
        "scorecard_id": str(inst["id"]),
        "name":                  inst.get(_F_NAME) or "Unknown",
        "state":                 inst.get(_F_STATE),
        "official_url":          inst.get(_F_URL),
        "country_code":          "US",
        "avg_net_price":         _int(inst.get(_F_NET_PRICE)),
        "tuition_out_of_state":  _int(inst.get(_F_TUITION)),
        "median_earnings_10yr":  _int(inst.get(_F_EARNINGS)),
        "completion_rate":       _float(inst.get(_F_COMPLETION)),
        "median_debt":           _int(inst.get(_F_DEBT)),
        "intl_student_pct":      _float(inst.get(_F_INTL)),
        "last_refreshed":        datetime.now(timezone.utc),
    }


def main() -> None:
    pages = TARGET // PER_PAGE  # 5 pages × 100 = 500
    all_rows: list[dict] = []

    print(f"Fetching up to {TARGET} institutions ({pages} pages × {PER_PAGE})...")
    for page in range(pages):
        results = _fetch_page(page)
        if not results:
            print(f"  Page {page}: empty — stopping early")
            break
        batch = [_to_row(r) for r in results if r.get("id")]
        all_rows.extend(batch)
        print(f"  Page {page}: {len(results)} schools -> cumulative {len(all_rows)}")

    if not all_rows:
        print("No data fetched. Check SCORECARD_API_KEY and filters.")
        sys.exit(1)

    db = SessionLocal()
    try:
        stmt = pg_insert(University).values(all_rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["scorecard_id"],
            set_={col: stmt.excluded[col] for col in all_rows[0] if col != "scorecard_id"},
        )
        db.execute(stmt)
        db.commit()

        total = db.query(University).count()
        print(f"\nUpserted {len(all_rows)} rows. Total universities in DB: {total}\n")

        samples = db.query(University).limit(5).all()
        print(f"{'Name':<50} {'ST':>3}  {'Net Price':>10}  {'Earn 10yr':>10}")
        print("-" * 80)
        for u in samples:
            price = f"${u.avg_net_price:,}" if u.avg_net_price else "N/A"
            earn  = f"${u.median_earnings_10yr:,}" if u.median_earnings_10yr else "N/A"
            print(f"{(u.name or '')[:50]:<50} {u.state or '??':>3}  {price:>10}  {earn:>10}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
