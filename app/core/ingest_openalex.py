"""
Match universities in the DB to OpenAlex institutions, store research metrics,
and record match_confidence: 'high' | 'low' | 'none'.

Confidence rules:
  high  →  in OVERRIDES (manually verified), OR exact normalized-name match
            AND the state/region is confirmed on both sides.
  low   →  fuzzy/containment name match, OR exact match but state unavailable.
  none  →  no OpenAlex institution found after all search variants.

Research metrics (citations_total, works_count, mean_citedness) are only
stored for 'high' confidence matches; they are cleared for 'low' / 'none'.

Run with:
    python -m app.core.ingest_openalex
"""

import json
import re
import socket
import sys
import time
from datetime import datetime, timezone
from http.client import RemoteDisconnected
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import urlopen

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.institution_overrides import OVERRIDES
from app.models.university import University

OPENALEX_BASE = "https://api.openalex.org/institutions"
REQUEST_DELAY = 1.0   # authenticated polite pool — 1 req/s is well within limits

_US_STATES: dict[str, str] = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia", "PR": "Puerto Rico",
}

_STOP = frozenset({
    "university", "of", "the", "college", "at", "and", "a", "an",
    "campus", "online", "system",
})

# Patterns stripped before searching to recover the base institution name
_CAMPUS_SUFFIX = re.compile(
    r'[-,\s]+(Main\s+Campus|Campus\s+Immersion|Digital\s+Immersion|Online|'
    r'World\s+Campus|National\s+&\s+Global|National\s+and\s+Global|Global\s+Campus)$',
    re.IGNORECASE,
)
_AT_CITY       = re.compile(r'\s+at\s+\S[\w\s]*$')   # "at Raleigh", "at Manoa"
_LEADING_THE   = re.compile(r'^The\s+', re.IGNORECASE)
_OF_LA_MO_TN   = re.compile(                          # "Northwestern State U of Louisiana"
    r'(\bUniversity)\s+of\s+(Louisiana|Missouri|Tennessee)$', re.IGNORECASE
)
_PA_SYSTEM     = re.compile(r'^(.+\bUniversity)\s+of Pennsylvania$')
_CUNY_PREFIX   = re.compile(r'^CUNY\s+(.+)$', re.IGNORECASE)
_CUNY_SUFFIX   = re.compile(r'^(.+\S)\s+CUNY$', re.IGNORECASE)
_BARE_UNI_OF   = re.compile(r'^University\s+of\b', re.IGNORECASE)  # "University of Texas", "University of NC"


def _normalize(name: str) -> str:
    name = name.lower()
    name = re.sub(r'[^\w\s]', ' ', name)
    tokens = sorted(t for t in name.split() if t and t not in _STOP)
    return ' '.join(tokens)


def _search_variants(name: str) -> list[str]:
    """Return ordered list of search strings to try, most specific first."""
    variants: list[str] = []

    s = _LEADING_THE.sub('', name).strip()
    s = _CAMPUS_SUFFIX.sub('', s).strip()
    pre_at = s  # save before AT_CITY strip
    s = _AT_CITY.sub('', s).strip()  # strip "at CITY" unless name starts "University at"
    if re.match(r'^University at ', s, re.IGNORECASE):
        s = _LEADING_THE.sub('', name).strip()  # restore — don't strip "University at Albany"

    m = _OF_LA_MO_TN.search(s)
    if m:
        s = s[:m.start(0) + len(m.group(1))].strip()  # "Northwestern State University"

    variants.append(s)

    # "University of Texas at Austin" → after AT_CITY strip → "University of Texas"
    # That bare stem matches OpenAlex names poorly (Jaccard 0.5, below 0.9 threshold).
    # Include the full pre-strip name so the canonical OpenAlex name can be found directly.
    if pre_at != s and _BARE_UNI_OF.match(s):
        variants.append(pre_at)

    # Try stripping geographic qualifier after last hyphen
    if '-' in s:
        before = s.rsplit('-', 1)[0].strip()
        if before not in variants:
            variants.append(before)

    # Try stripping everything after "/" (e.g. "Denver/Anschutz" → "Denver")
    if '/' in s:
        before = s.split('/')[0].strip()
        if before not in variants:
            variants.append(before)

    # CUNY prefix: "CUNY Hunter College" → try "Hunter College" first
    m_cuny = _CUNY_PREFIX.match(name)
    if m_cuny:
        variants.insert(0, m_cuny.group(1).strip())

    # CUNY suffix: "College of Staten Island CUNY" → try "College of Staten Island"
    m_csfx = _CUNY_SUFFIX.match(name)
    if m_csfx:
        variants.insert(0, m_csfx.group(1).strip())

    # PA state system: "East Stroudsburg University of Pennsylvania" → "East Stroudsburg University"
    m_pa = _PA_SYSTEM.match(name)
    if m_pa:
        variants.insert(0, m_pa.group(1).strip())

    # Deduplicate preserving order
    seen: set[str] = set()
    result: list[str] = []
    for v in variants:
        if v and v not in seen:
            seen.add(v)
            result.append(v)
    return result


def _api_params(**extra) -> dict:
    params = {'select': 'id,ror,display_name,cited_by_count,works_count,summary_stats,geo'}
    if settings.OPENALEX_API_KEY:
        params['api_key'] = settings.OPENALEX_API_KEY
    params.update(extra)
    return params


_TRANSIENT = (
    socket.gaierror,      # DNS resolution failure  (getaddrinfo failed)
    socket.timeout,       # low-level socket timeout
    TimeoutError,         # Python built-in timeout
    ConnectionError,      # covers ConnectionResetError, BrokenPipeError, etc.
    RemoteDisconnected,   # server closed connection mid-response
    OSError,              # catch-all for remaining network-layer errors
)


def _get(url: str) -> dict | None:
    max_attempts = 6
    for attempt in range(max_attempts):
        try:
            with urlopen(url, timeout=30) as resp:
                return json.loads(resp.read())
        except HTTPError as exc:
            if exc.code == 429:
                # exponential back-off: 60 → 120 → 240 → 480 → 960 s (cap 960)
                wait = min(60 * (2 ** attempt), 960)
                print(f'    429 rate-limit — waiting {wait}s '
                      f'(attempt {attempt+1}/{max_attempts})')
                time.sleep(wait)
            else:
                print(f'    HTTP {exc.code}: {url[:80]}')
                return None
        except _TRANSIENT as exc:
            # DNS blip, timeout, connection reset — retry with backoff
            # 5 → 10 → 20 → 40 → 80 s (cap 80)
            wait = min(5 * (2 ** attempt), 80)
            print(f'    Network error ({type(exc).__name__}) — retrying in {wait}s '
                  f'(attempt {attempt + 1}/{max_attempts})')
            time.sleep(wait)
        except Exception as exc:
            print(f'    Unexpected error: {exc}')
            return None
    print(f'    Gave up after {max_attempts} retries: {url[:80]}')
    return None


def _search(query: str) -> list[dict]:
    params = _api_params(filter='country_code:US', search=query, per_page=5)
    data = _get(f'{OPENALEX_BASE}?{urlencode(params)}')
    return (data or {}).get('results', [])


def _fetch_by_id(oa_id: str) -> dict | None:
    # Extract the short ID (e.g. "I55732556") and route through the API base
    short = oa_id.split('/')[-1]  # handles both "I55732556" and full URL
    params = _api_params()
    return _get(f'{OPENALEX_BASE}/{short}?{urlencode(params)}')


def _determine_confidence(
    q_norm: str,
    r_norm: str,
    uni_state: str | None,
    geo: dict | None,
    from_override: bool,
) -> str | None:
    """
    Returns 'high', 'low', or None (reject — don't use this hit).
    """
    if from_override:
        return 'high'

    # Reject state mismatches when both sides have state data
    state_full = _US_STATES.get(uni_state or '', '')
    region = ((geo or {}).get('region') or '').strip()
    state_available = bool(state_full and region)
    if state_available and state_full.lower() != region.lower():
        return None  # wrong campus / state — reject

    # Check name similarity
    q_t = set(q_norm.split())
    r_t = set(r_norm.split())
    if not q_t or not r_t:
        return None

    exact = (q_norm == r_norm)
    shorter, longer = (q_t, r_t) if len(q_t) <= len(r_t) else (r_t, q_t)
    contained = len(shorter) >= 2 and shorter.issubset(longer)
    thresh = 0.9 if max(len(q_t), len(r_t)) <= 2 else 0.80
    jaccard = len(q_t & r_t) / len(q_t | r_t)
    similar = jaccard >= thresh

    if not (exact or contained or similar):
        return None  # no name similarity — not a match

    # 'high': exact name match and state confirmed on both sides
    if exact and state_available:
        return 'high'

    return 'low'


def _find_match(
    uni: University, results: list[dict], search_norm: str
) -> tuple[dict, str] | None:
    """Return (hit, confidence) for the first acceptable result, else None."""
    for r in results:
        r_norm = _normalize(r.get('display_name', ''))
        conf = _determine_confidence(search_norm, r_norm, uni.state, r.get('geo'), False)
        if conf is not None:
            return r, conf
    return None


def _apply(uni: University, hit: dict, confidence: str) -> None:
    uni.openalex_id = hit.get('id')
    uni.ror_id = hit.get('ror')
    uni.match_confidence = confidence
    if confidence == 'high':
        uni.citations_total = hit.get('cited_by_count')
        uni.works_count = hit.get('works_count')
        stats = hit.get('summary_stats') or {}
        uni.mean_citedness = stats.get('2yr_mean_citedness')
    else:
        uni.citations_total = None
        uni.works_count = None
        uni.mean_citedness = None
    uni.last_refreshed = datetime.now(timezone.utc)


def _clear(uni: University) -> None:
    uni.openalex_id = None
    uni.ror_id = None
    uni.match_confidence = 'none'
    uni.citations_total = None
    uni.works_count = None
    uni.mean_citedness = None
    uni.last_refreshed = datetime.now(timezone.utc)


_MARQUEE = [
    'University of Michigan-Ann Arbor',
    'Pennsylvania State University-Main Campus',
    'Columbia University in the City of New York',
    'Ohio State University-Main Campus',
    'Rutgers University-New Brunswick',
    'Purdue University-Main Campus',
    'University of Virginia-Main Campus',
]


_SPOT_CHECK = [
    ('Harvard University',                        'Harvard'),
    ('Massachusetts Institute of Technology',     'MIT'),
    ('Stanford University',                       'Stanford'),
    ('Cornell University',                        'Cornell'),
    ('The University of Texas at Austin',         'UT Austin'),
]


def main() -> None:
    only_none = '--only-none' in sys.argv

    if settings.OPENALEX_API_KEY:
        print(f'API key loaded (length {len(settings.OPENALEX_API_KEY)}) — '
              f'authenticated rate limits apply.')
    else:
        print('WARNING: OPENALEX_API_KEY is not set — using anonymous rate limits (lower).')
    print()

    db = SessionLocal()
    try:
        q = db.query(University).filter(University.country_code == 'US')
        if only_none:
            q = q.filter(University.match_confidence == 'none')
        unis = q.all()
        total = len(unis)
        mode = ' (only-none mode)' if only_none else ''
        print(f'Matching {total} universities{mode} (improved normalization + {len(OVERRIDES)} overrides)...\n')

        high = low = none_count = 0
        low_list:  list[str] = []
        none_list: list[str] = []

        for i, uni in enumerate(unis, 1):
            override_id = OVERRIDES.get(uni.scorecard_id)

            if override_id:
                hit = _fetch_by_id(override_id)
                time.sleep(REQUEST_DELAY)
                if hit:
                    _apply(uni, hit, 'high')
                    high += 1
                else:
                    _clear(uni)
                    none_count += 1
                    none_list.append(f'{uni.name} [override fetch failed]')
            else:
                variants = _search_variants(uni.name)
                found: tuple[dict, str] | None = None
                for variant in variants:
                    results = _search(variant)
                    time.sleep(REQUEST_DELAY)
                    variant_norm = _normalize(variant)
                    found = _find_match(uni, results, variant_norm)
                    if found:
                        break

                if found:
                    hit, conf = found
                    _apply(uni, hit, conf)
                    if conf == 'high':
                        high += 1
                    else:
                        low += 1
                        low_list.append(
                            f'{uni.name} -> {hit.get("display_name","?")} '
                            f'[state={(uni.state or "?")}]'
                        )
                else:
                    _clear(uni)
                    none_count += 1
                    none_list.append(uni.name)

            if i % 50 == 0:
                db.commit()
                print(f'  [{i:>3}/{total}]  high={high}  low={low}  none={none_count}')

        db.commit()

        print(f'\n=== Final Results ===')
        print(f'Total:  {total}')
        print(f'High:   {high}   ({high / total * 100:.1f}%)')
        print(f'Low:    {low}   ({low / total * 100:.1f}%)')
        print(f'None:   {none_count}   ({none_count / total * 100:.1f}%)')

        print(f'\n--- 5 sample HIGH-confidence matched rows ---')
        samples = (
            db.query(University)
            .filter(University.match_confidence == 'high', University.citations_total.isnot(None))
            .limit(5).all()
        )
        print(f'{"Name":<50}  {"Citations":>14}  {"Works":>8}')
        print('-' * 78)
        for u in samples:
            print(f'{(u.name or "")[:50]:<50}  {u.citations_total or 0:>14,}  {u.works_count or 0:>8,}')

        if low_list:
            print(f'\n--- LOW confidence ({len(low_list)}) ---')
            for s in sorted(low_list):
                print(f'  {s}')

        if none_list:
            print(f'\n--- NONE / unmatched ({len(none_list)}) ---')
            for s in sorted(none_list):
                print(f'  {s}')

        print(f'\n--- Marquee school check ---')
        print(f'{"Name":<55}  {"Confidence":<10}  {"OpenAlex ID"}')
        print('-' * 100)
        for mname in _MARQUEE:
            u = db.query(University).filter(University.name == mname).first()
            if u:
                conf = u.match_confidence or 'not set'
                oa = u.openalex_id or '—'
                print(f'{mname[:55]:<55}  {conf:<10}  {oa}')
            else:
                print(f'{mname[:55]:<55}  NOT IN DB')

        if only_none:
            # Show DB-wide totals after the targeted re-run
            db_high  = db.query(University).filter(University.country_code == 'US', University.match_confidence == 'high').count()
            db_low   = db.query(University).filter(University.country_code == 'US', University.match_confidence == 'low').count()
            db_none  = db.query(University).filter(University.country_code == 'US', University.match_confidence == 'none').count()
            db_total = db_high + db_low + db_none
            print(f'\n=== DB-wide totals after re-run ===')
            print(f'Total:  {db_total}')
            print(f'High:   {db_high}   ({db_high / db_total * 100:.1f}%)')
            print(f'Low:    {db_low}   ({db_low / db_total * 100:.1f}%)')
            print(f'None:   {db_none}   ({db_none / db_total * 100:.1f}%)')

            print(f'\n--- Spot-check (was "none" last run) ---')
            print(f'{"Name":<55}  {"Confidence":<10}  {"OpenAlex ID"}')
            print('-' * 100)
            for db_name, label in _SPOT_CHECK:
                u = db.query(University).filter(University.name == db_name).first()
                if u:
                    conf = u.match_confidence or 'not set'
                    oa = u.openalex_id or '—'
                    print(f'{label:<55}  {conf:<10}  {oa}')
                else:
                    print(f'{label:<55}  NOT IN DB')

    finally:
        db.close()


if __name__ == '__main__':
    main()
