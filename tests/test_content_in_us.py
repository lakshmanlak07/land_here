"""Guards on the India -> US journey content (app/core/content_in_us.py)."""

from collections import Counter
from urllib.parse import urlparse

from app.core.content_in_us import IN_US_STEPS

# Sources reachable and authoritative as of the 2026-10-13 review.
OFFICIAL_HOSTS = {
    "studyinthestates.dhs.gov",
    "www.ustraveldocs.com",   # official State Dept. appointment service for India
    "www.consumerfinance.gov",
    "www.fcc.gov",
}

# Links found dead on 2026-10-12/13; they must never come back.
DEAD_LINKS = {
    "https://studyinthestates.dhs.gov/students/get-started",
    "https://studyinthestates.dhs.gov/students/prepare/understanding-the-form-i-20",
    "https://studyinthestates.dhs.gov/students/prepare/prepare-for-departure",
    "https://studyinthestates.dhs.gov/students/prepare/health-insurance-and-your-f-and-m-student-status",
    "https://studyinthestates.dhs.gov/students/prepare/entering-the-united-states",
    "https://studyinthestates.dhs.gov/students/prepare/documents-to-carry-when-entering-the-united-states",
    "https://studyinthestates.dhs.gov/students/study/report-to-your-dso",
    "https://studyinthestates.dhs.gov/students/study/sevis-check-in",
    "https://www.consumerfinance.gov/consumer-tools/banking/",
    "https://www.fcc.gov/consumers/guides/choosing-wireless-carrier-or-reseller",
}

BRANDS = ("Bank of America", "Chase", "Wise", "Revolut", "AT&T", "T-Mobile", "Verizon")


def test_fifteen_steps_with_unique_phase_positions():
    assert len(IN_US_STEPS) == 15
    keys = Counter((s["phase"], s["step_number"]) for s in IN_US_STEPS)
    assert max(keys.values()) == 1


def test_every_source_is_https_and_official():
    for s in IN_US_STEPS:
        u = urlparse(s["official_source_url"])
        assert u.scheme == "https", s["title"]
        assert u.netloc in OFFICIAL_HOSTS, (s["title"], u.netloc)
        assert s["official_source_url"] not in DEAD_LINKS, s["title"]


def test_no_commercial_endorsements():
    for s in IN_US_STEPS:
        for brand in BRANDS:
            assert brand not in s["explanation"], (s["title"], brand)


def test_verification_flags_are_explicit_booleans():
    assert all(isinstance(s["is_verified"], bool) for s in IN_US_STEPS)
    # 9 verified on 2026-10-13; see VERIFY_visa_india_us.md for the 6 that are not.
    assert sum(s["is_verified"] for s in IN_US_STEPS) == 9


def test_no_claim_that_students_can_view_sevis_themselves():
    text = " ".join(s["explanation"] for s in IN_US_STEPS)
    assert "monitor your SEVIS" not in text
