"""
DRAFT — UNVERIFIED. NOT imported anywhere; NOT wired into seed().

India -> Australia (Student visa, subclass 500) InfoStep DRAFT.

This module mirrors the field structure of IN_CA_STEPS / IN_UK_STEPS in
app/core/seed.py (keys: phase, step_number, title, explanation,
official_source_name, official_source_url) so it can be promoted later — but
ONLY after each step is human-verified against its official Department of Home
Affairs / federal-government source and ticked off in VERIFY_visa_IN_AU.md.

Until then:
  * IS_VERIFIED is False for every step.
  * Nothing here is imported by seed.py and seed() does not touch IN->AU.
  * 3 steps are marked MISSING SOURCE (official_source_url=None): they were
    sourced only to a homepage or a non-specific page in the original draft
    (mobile/content/drafts/in_au_steps_draft.md). No source was invented for
    them — they must get a real official source or be dropped before seeding.

Australia specifics (not copied from the US/CA/UK flows): electronic
Confirmation of Enrolment (CoE) via the government PRISMS system; Overseas
Student Health Cover (OSHC); the Genuine Student (GS) requirement, which
replaced the former Genuine Temporary Entrant (GTE) statement; financial-
capacity evidence whose required amount is revised periodically; online
lodgement via ImmiAccount; a digital visa linked to the passport (usually no
physical label); VEVO to check visa details and conditions; strict biosecurity
on arrival. No fees, currency amounts, or processing times are asserted as fact.
Not legal or immigration advice.
"""

ORIGIN_CODE = "IN"
DESTINATION_CODE = "AU"
IS_VERIFIED = False  # every step below is unverified — do not seed as True

# Sentinel for steps that had no official, specific source in the draft.
# Do NOT seed a step while its official_source_url is None.
MISSING_SOURCE = "MISSING SOURCE — needs an official, specific source or drop"

IN_AU_STEPS_DRAFT = [
    # ── after_acceptance ──────────────────────────────────────────────────────
    {
        "phase": "after_acceptance",
        "step_number": 1,
        "title": "Receive Your Confirmation of Enrolment (CoE)",
        "explanation": (
            "After you accept your offer and meet the institution's conditions (usually "
            "including an initial fee payment), your provider issues an electronic Confirmation "
            "of Enrolment (CoE) through the government PRISMS system. The CoE is required for the "
            "Student visa (subclass 500) application. Confirm that the CoE details match your "
            "passport and offer."
        ),
        "official_source_name": "Department of Home Affairs — Student visa (subclass 500)",
        "official_source_url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    },
    {
        "phase": "after_acceptance",
        "step_number": 2,
        "title": "Arrange Overseas Student Health Cover (OSHC)",
        "explanation": (
            "Student visa holders are generally required to hold Overseas Student Health Cover "
            "(OSHC) for the duration of their stay, usually arranged before the visa is granted. "
            "Confirm the current requirement and approved providers; do not state a premium "
            "amount (subject to change). Keep proof of cover for your application."
        ),
        "official_source_name": "Department of Health — Overseas Student Health Cover",
        "official_source_url": "https://www.health.gov.au/topics/private-health-insurance/about-private-health-insurance/overseas-student-health-cover-oshc",
    },
    # ── visa_process ──────────────────────────────────────────────────────────
    {
        "phase": "visa_process",
        "step_number": 1,
        "title": "Confirm Eligibility and the Genuine Student Requirement",
        "explanation": (
            "Check the current subclass 500 eligibility, including the Genuine Student (GS) "
            "requirement, English language evidence, and any conditions for your situation. The "
            "GS requirement replaced the former Genuine Temporary Entrant statement — confirm "
            "the exact current questions and evidence required on the official visa guidance "
            "before relying on older descriptions."
        ),
        "official_source_name": "Department of Home Affairs — Student visa (subclass 500): Eligibility",
        "official_source_url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    },
    {
        "phase": "visa_process",
        "step_number": 2,
        "title": "Prepare Evidence of Financial Capacity",
        "explanation": (
            "You must show you can cover tuition, travel, and living costs. The required amount "
            "and accepted evidence are set by the Department and revised periodically — do not "
            "rely on any figure quoted elsewhere; verify the current financial-capacity "
            "requirement on the official site (subject to change)."
        ),
        "official_source_name": "Department of Home Affairs — Student visa (subclass 500)",
        "official_source_url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    },
    {
        "phase": "visa_process",
        "step_number": 3,
        "title": "Create an ImmiAccount and Lodge the Application Online",
        "explanation": (
            "Apply for the subclass 500 online through ImmiAccount. You attach your CoE, OSHC "
            "evidence, GS responses, financial and English evidence, passport, and other "
            "documents on the application's checklist, and pay the visa application charge "
            "(amount set by the Department — verify, subject to change)."
        ),
        "official_source_name": "Department of Home Affairs — Student visa (subclass 500): How to apply",
        "official_source_url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/how-to-apply",
    },
    {
        "phase": "visa_process",
        "step_number": 4,
        "title": "Complete Health Examinations and Biometrics If Required",
        "explanation": (
            "You may be asked to complete a health examination with an approved panel clinic "
            "and/or provide biometrics. Confirm whether these apply to you and follow the "
            "official instructions and approved providers; do not arrange a medical with a "
            "non-panel clinic."
        ),
        "official_source_name": "Department of Home Affairs — Health examinations",
        "official_source_url": "https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/health",
    },
    {
        "phase": "visa_process",
        "step_number": 5,
        "title": "Await the Decision and Note Your Visa Conditions",
        "explanation": (
            "If granted, you receive a visa grant notification with your visa conditions (such "
            "as work limits and the requirement to maintain enrolment and OSHC). Save the grant "
            "notice; Australia uses a digital visa linked to your passport, so there is usually "
            "no physical label."
        ),
        "official_source_name": "Department of Home Affairs — Student visa (subclass 500)",
        "official_source_url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    },
    # ── before_departure ──────────────────────────────────────────────────────
    {
        # MISSING SOURCE: original draft cited only the Study Australia homepage.
        "phase": "before_departure",
        "step_number": 1,
        "title": "Arrange Accommodation Before You Arrive",
        "explanation": (
            "Secure housing before leaving India. Many institutions help arrange managed student "
            "accommodation or homestays; otherwise confirm a rental in writing before travelling. "
            "A confirmed address eases later setup."
        ),
        "official_source_name": MISSING_SOURCE,
        "official_source_url": None,
    },
    {
        "phase": "before_departure",
        "step_number": 2,
        "title": "Check Your Visa Grant and Conditions Online",
        "explanation": (
            "Review your visa grant notice and conditions, and confirm your details using the "
            "official online checking service. Understand obligations such as maintaining "
            "enrolment, OSHC, and any work-hour limits before you travel."
        ),
        "official_source_name": "Department of Home Affairs — Visa Entitlement Verification Online (VEVO)",
        "official_source_url": "https://immi.homeaffairs.gov.au/visas/already-have-a-visa/check-visa-details-and-conditions",
    },
    {
        # NOTE: source is the generic subclass-500 page, which does not specifically
        # document travel booking. Tighten the source on verification, or drop.
        "phase": "before_departure",
        "step_number": 3,
        "title": "Book Travel and Plan Your Arrival Timing",
        "explanation": (
            "Plan your arrival around your course start date and any orientation. Keep your visa "
            "grant notice and CoE accessible for airline check-in and Australian border "
            "clearance. Verify current arrival guidance on the official site (subject to change)."
        ),
        "official_source_name": "Department of Home Affairs — Student visa (subclass 500)",
        "official_source_url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    },
    {
        "phase": "before_departure",
        "step_number": 4,
        "title": "Organise Documents and Check Biosecurity Rules",
        "explanation": (
            "Carry your passport, visa grant notice, CoE, OSHC evidence, and financial documents "
            "in your hand luggage. Australia has strict biosecurity rules — check what you must "
            "declare and what cannot be brought in before you pack."
        ),
        "official_source_name": "Department of Agriculture, Fisheries and Forestry — Bringing goods into Australia",
        "official_source_url": "https://www.agriculture.gov.au/biosecurity-trade/travelling/bringing-mailing-goods",
    },
    # ── after_arrival ─────────────────────────────────────────────────────────
    {
        "phase": "after_arrival",
        "step_number": 1,
        "title": "Clear Immigration and Biosecurity at the Airport",
        "explanation": (
            "On arrival, clear immigration (your visa is digital and linked to your passport) and "
            "complete the Incoming Passenger Declaration for biosecurity. Declare any required "
            "items honestly. Keep your CoE and visa details handy in case you are asked."
        ),
        "official_source_name": "Australian Border Force — Entering and leaving Australia",
        "official_source_url": "https://www.abf.gov.au/entering-and-leaving-australia",
    },
    {
        # MISSING SOURCE: original draft cited only the Study Australia homepage.
        "phase": "after_arrival",
        "step_number": 2,
        "title": "Enrol and Report to Your Institution",
        "explanation": (
            "Complete enrolment and attend orientation with your institution's international "
            "student support team. They confirm your enrolment in PRISMS and advise on "
            "maintaining your visa conditions, working, and student services."
        ),
        "official_source_name": MISSING_SOURCE,
        "official_source_url": None,
    },
    {
        # MISSING SOURCE: original draft cited the ATO Tax File Number page, which is
        # about TFNs, not opening a bank account.
        "phase": "after_arrival",
        "step_number": 3,
        "title": "Open an Australian Bank Account",
        "explanation": (
            "A local account helps with rent, wages, and daily spending. Banks typically ask for "
            "your passport and proof of address; some let you begin the process before arrival. "
            "Check each provider's current requirements, and note you may need a Tax File Number "
            "for some purposes."
        ),
        "official_source_name": MISSING_SOURCE,
        "official_source_url": None,
    },
    {
        "phase": "after_arrival",
        "step_number": 4,
        "title": "Get an Australian SIM Card",
        "explanation": (
            "A local number is needed for banking, your institution's systems, and daily life. "
            "Prepaid SIMs from major carriers and sub-brands are widely available at shops and "
            "airports, usually with proof of identity. Compare coverage for your city."
        ),
        "official_source_name": "Australian Communications and Media Authority — Mobile services",
        "official_source_url": "https://www.acma.gov.au/mobile-phone-services",
    },
]
