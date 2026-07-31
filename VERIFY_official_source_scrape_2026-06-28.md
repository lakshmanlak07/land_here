# Official Source Scrape — Fact-Check Comparison Report
**Date scraped:** 2026-06-28  
**Scraped by:** AI (Claude) — NOT a substitute for owner verification  
**Sources fetched:** travel.state.gov, gov.uk/student-visa, canada.ca/study-permit  
**Action required:** Human owner must review each flagged item below and update seed.py / constants as needed.

---

## RULE: This file does NOT change is_verified flags
AI scraping is not a substitute for human verification. Nothing in this file
authorises setting `is_verified=True` on any step. The owner must read each
official page and verify manually.

---

## 1 · India → United States (F-1 Visa)
**Official source scraped:** https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html

### Step-by-step comparison

Our seeded steps vs. the official "How to Apply" flow:

| Our Step | Official Step | Status |
|---|---|---|
| Receive Form I-20 from University | "SEVP-approved school issues Form I-20 after enrolling in SEVIS" | ✅ Matches |
| Review I-20 for Accuracy | Implied ("You and your school official must sign the Form I-20") | ✅ Reasonable |
| Pay SEVIS I-901 Fee | "must pay the SEVIS I-901 fee" (before DS-160) | ✅ Order correct |
| Complete DS-160 Online Application | "Complete the Online Visa Application, Form DS-160" | ✅ Matches |
| Pay MRV Visa Application Fee ($185) | "Pay the non-refundable visa application fee $185" | ✅ Amount correct at scrape time |
| Schedule Interview at US Consulate | "Schedule an appointment for your visa interview at the U.S. Embassy or Consulate" | ✅ Matches |
| Attend the F-1 Visa Interview | "Attend Your Visa Interview" | ✅ Matches |
| Book Flight Within Allowed Entry Window | "not permitted to enter the United States earlier than 30 days before the start date" | ✅ Covered |

### Flags for human review

- **MRV fee ($185):** Confirmed at time of scrape. Fee can change — owner should re-confirm before each app-store release.
- **30-day entry rule:** Our step "Book Your Flight Within the Allowed Entry Window" covers this but does not state "30 days" explicitly. The official page says "Student (F and M) visas for new students can be issued up to 365 days before the start date... you will not be allowed to enter the United States on your student visa more than 30 days before the start date." Consider whether to make the 30-day rule more explicit.
- **Missing phase (before_applying):** Official guidance says "The first step is to apply to a SEVP-approved school." We have no `before_applying` steps for IN→US. This is a gap in coverage — low priority since it's pre-acceptance — but worth noting.
- **Fingerprints / biometrics:** Official says "Ink-free, digital fingerprint scans are taken as part of the application process. They are usually taken during your interview." We do not have an explicit biometrics step for the US corridor. The US biometrics happen at interview (unlike Canada/UK where it's a separate VAC visit), so this is fine — just confirm our interview step makes this clear.
- **No major discrepancies found.** Steps are in correct order with correct sequence.

---

## 2 · India → United Kingdom (Student Visa, formerly Tier 4)
**Official source scraped:** https://www.gov.uk/student-visa  
**Page last updated (per gov.uk metadata):** 2026-06-26 (day before this scrape)

### Step-by-step comparison

| Our Step | Official Step | Status |
|---|---|---|
| Receive CAS from Sponsor | "have been offered a place on a course by a licensed student sponsor" → CAS issued | ✅ Matches |
| Check ATAS clearance | "If you're doing a masters degree or above, you may need to apply for the ATAS certificate" | ✅ Matches |
| Confirm Financial Maintenance | "have enough money to support yourself and pay for your course" | ✅ Matches |
| TB Test (India applicants) | "Check if you need a tuberculosis (TB) test" (India listed) | ✅ Matches |
| Apply Online + Pay Visa Fee | "Apply from outside the UK £558" | ✅ Step exists — see fee flag below |
| Pay IHS (Immigration Health Surcharge) | "pay the healthcare surcharge as part of your application" | ✅ Matches |
| Provide Biometrics at UKVI VAC | Implied in "prove your identity as part of your application" | ✅ Matches |
| Receive Decision + eVisa | "If your application is successful, you'll get an eVisa" | ✅ Matches |
| Set Up UKVI Account | "Get access to your eVisa by setting up a UKVI account" | ✅ Matches |

### Flags for human review

- **🚨 UK VISA FEE: The fee is now £558 (confirmed on official page, last updated 2024-10-31).** Our seed.py defers fees to the official page rather than hardcoding them — which is the correct design. Confirm the `official_source_url` for the fee step points to https://www.gov.uk/student-visa/apply so users see the current fee.

- **🚨 GRADUATE VISA CHANGE (policy change, not our visa steps):** The gov.uk page now states: "A Graduate visa will allow you to stay in the UK after successfully completing your course for: 2 years if you apply on or before 31 December 2026 / 18 months if you apply on or after 1 January 2027." This is NOT a change to the student visa application steps — it's a post-study work right. We do not cover this in our app, which is correct. No action needed, but be aware if you add post-arrival guidance for UK.

- **Application timing:** The official page says "The earliest you can apply for a visa is 6 months before you start your course." We do not surface this timing guidance explicitly. Consider adding a note to the CAS or financial step.

- **Decision time:** Official says "You'll usually get a decision within 3 weeks if you're outside the UK." We do not display processing times. Low priority.

- **English language requirement:** Our steps do not include "prove English language proficiency." This is a prerequisite checked at the CAS stage. Our steps start at after_acceptance which is correct, but the English requirement step is technically part of visa_process documents. Consider whether to add a step or note.

- **No major structural discrepancies found.**

---

## 3 · India → Canada (Study Permit)
**Official source scraped:** https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html  
**Page last modified (per metadata):** 2026-04-24

### Observations

The main study permit page is a hub page with sections (Who can apply, Get documents, How to apply, After you apply, Prepare for arrival, While you study). The step-by-step detail is on sub-pages not scraped here.

**Study permit fee confirmed:** CAD $150 (shown on the official page). Our seed does not hardcode this amount — correct.

### Flags for human review

- **PAL/TAL requirement:** Our step "Obtain Your Provincial or Territorial Attestation Letter (PAL/TAL)" was introduced by IRCC in 2024. The main page does not mention it prominently (it may be in sub-pages). **Owner must re-verify on the IRCC "How to apply" sub-page** (https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html) that PAL/TAL is still required and the step is current.

- **GIC (Guaranteed Investment Certificate):** Our step "Show Proof of Financial Support (a GIC Is One Accepted Option)" is accurate — a GIC is one method, not mandatory. Confirm this framing is still current.

- **Processing times:** The official page says "Varies by country." We do not surface processing time estimates. Low priority.

- **Biometrics sub-page not scraped.** The "Give Your Biometrics" step should be verified against https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/after-apply-next-steps.html

- **No major structural discrepancies detected from the main hub page.**

---

## Summary

| Corridor | Structural Issues | Fee Issues | Policy Changes |
|---|---|---|---|
| IN → US | None found | $185 MRV — re-confirm before release | None |
| IN → UK | None found | £558 — our steps defer to source (correct) | Graduate visa changing Jan 2027 (not our scope) |
| IN → CA | PAL/TAL needs sub-page re-verify | CAD $150 — steps defer to source (correct) | None detected |

**RECOMMENDED HUMAN ACTIONS (in priority order):**
1. Re-verify Canada PAL/TAL step against IRCC "How to apply" sub-page
2. Re-confirm US MRV fee ($185) is still current before next release
3. Consider adding UK application timing note ("apply up to 6 months before start date")
4. Consider making the US 30-day entry window more explicit in the before_departure step

---
*This report was auto-generated from official government web pages. It is a comparison aid for human review, not a verification record. The owner must personally read each official source before marking any content as verified.*
