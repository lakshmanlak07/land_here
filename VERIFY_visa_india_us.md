# Verification Record — India → United States (F-1)

Review date: **2026-10-13**. Reviewer: Claude (automated review in a real browser; read-only).
Content: `app/core/content_in_us.py`. Guard tests: `tests/test_content_in_us.py`.

**Result: 9 verified · 6 not verified** (2 blocked or need legal review, 4 general tips with no government source).
"Verified" means every claim in the rewritten text was matched to the cited page on the review date. It is not legal advice, and a human should spot-check before launch.

## Findings that forced rewrites
- **13 of the 15 original source links were dead or wrong.** These included 9 Study in the States URLs (that site has been restructured), the CFPB and FCC pages, and two ustraveldocs India pages that pointed at the wrong steps (`step-2` was used for fees, `step-3` for scheduling).
- **New requirement:** the US Mission in India instructs F-1 applicants to set all social-media privacy settings to "public" (in.usembassy.gov/visas, checked 2026-10-13). This was missing from the old text.
- **The I-20 must be signed** by the student (and by a parent if the student is under 18). This was missing.
- **Old step 7 said to bring a photo.** That is wrong for most applicants: the photo is uploaded with the DS-160.
- **Old step 13 said students can monitor SEVIS themselves.** That is wrong; the claim has been removed.
- **Old step 3 listed "electronic check".** DHS lists only a credit card online for most nationalities.
- **Old steps 14 and 15 named specific banks, fintechs and carriers.** These endorsements have been removed.
- **DHS final rule, Federal Register 2026-14439, published 2026-07-17.** F students are admitted for a fixed period (program length, not to exceed 4 years, plus 30 days for arrival and 30 days for departure) instead of "duration of status". Extensions are filed on Form I-539.
  - The Federal Register lists the **effective date as 2026-09-15**. It is a major rule subject to congressional review, and DHS will publish a notice if that date changes.
  - **I did not confirm its status after that review. Flagged for qualified review.**

## Pages that could not be checked
- **travel.state.gov and ceac.state.gov:** they show a Cloudflare "verify you are human" CAPTCHA. I did not attempt it. **A human should check the State Department's student-visa page for step V5 (the list of interview documents).**

## Per-step record

| ID | Step (new title) | Required change vs. old text | Source | Result | Notes |
|---|---|---|---|---|---|
| A1 | Receive and Sign Your Form I-20 | Dead link; adds signing requirement | studyinthestates.dhs.gov/students/prepare/students-and-the-form-i-20 | **Verified** | Page last updated 2025-04-29 |
| A2 | Check the Details on Your I-20 | Dead link; dropped "SEVIS ID begins with N" and "must match passport exactly" (not on the source) | same | **Verified** | |
| V1 | Pay the I-901 SEVIS Fee | Payment methods corrected; "non-refundable" removed (not on the source) | studyinthestates.dhs.gov/students/prepare/paying-the-i-901-sevis-fee | **Verified** | Fee amount deliberately not stated |
| V2 | Complete the DS-160 | ceac.state.gov blocked; re-sourced; added AA barcode and 20-minute timeout | ustraveldocs.com/in/en/step-2 | **Verified** | ustraveldocs is the State Dept.'s official appointment service for India; the Embassy links to it |
| V3 | Pay the Visa Application (MRV) Fee | Wrong link fixed; added payment methods, 365-day validity, no double payment | ustraveldocs.com/in/en/step-3 | **Verified** | The page lists F visas at $185; the amount is deliberately not stated in the app |
| V4 | Book Your Biometrics and Interview Appointments | Wrong link fixed; added VAC appointment (≥2 business days before interview), country-of-residence rule, 365-day issuance | ustraveldocs.com/in/en/step-4 + DHS I-20 page | **Verified** | Removed the "March–June peak" claim (not on the source) |
| V5 | Attend Your Visa Interview | Removed photo claim; added No-Show, banned items, social-media rule, 221(g) | ustraveldocs.com/in/en/step-5; in.usembassy.gov/visas | **Not verified** | The full document list ("evidence of how you will pay") is on travel.state.gov, which was blocked |
| D1 | Arrange Housing Through Your University | Rewritten as general guidance | DHS School Search | **Not verified** — general tip | No government source covers housing |
| D2 | Check Your University's Health Insurance Requirement | Rewritten: insurance is set by the school, not a single US rule | DHS School Search | **Not verified** — general tip | |
| D3 | Plan Your Arrival Within the 30-Day Window | Dead link; added that the 2026 rule keeps the 30-day period | studyinthestates.dhs.gov/students/travel/getting-to-the-united-states | **Verified** | The rule's quick-facts page states the 30-day arrival period continues |
| D4 | Carry Your Key Documents in Your Hand Luggage | Old "must carry" list overstated; limited to passport, visa, I-20 plus the copies advice | same | **Verified** | |
| R1 | Report to Your School by the Program Start Date | Old "within a day or two" replaced by the DHS rule (report by program start date) | same | **Verified** | |
| R2 | Check Your I-94 Record and Your Admit Until Date | Replaces the incorrect "SEVIS check-in" step | DHS final-rule quick facts; i94.cbp.dhs.gov | **Not verified** — legal review | Matches the DHS text; rule status after congressional review not confirmed |
| R3 | Open a US Bank Account | Brand names removed; dead link replaced | consumerfinance.gov/consumer-tools/bank-accounts/ | **Not verified** — general tip | |
| R4 | Get a US Phone Number | Brand names and the SSN claim removed; dead link replaced | fcc.gov/consumer-guides | **Not verified** — general tip | |

## To reach 15/15
1. **V5:** a human opens travel.state.gov → Study & Exchange → Student Visa, confirms the documents list, adjusts the text, and sets `is_verified=True`.
2. **R2:** qualified review of the final rule's current status. Then set `is_verified=True`.
3. **D1, D2, R3, R4:** these will never have a government source. Decide whether to show them as "General tip" (current behaviour: "Unverified" tag) or move them out of the visa journey.

Re-verify every 90 days, or immediately on news of rule changes.
