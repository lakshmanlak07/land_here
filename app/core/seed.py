"""
Run with:  python -m app.core.seed
Seeds Countries and the IN->US InfoStep corridor.
All other corridors and country guides are left empty intentionally.
"""

from app.core.database import SessionLocal
from app.models.country import Country
from app.models.country_guide import CountryGuide  # noqa: F401 - needed so SQLAlchemy resolves all relationships
from app.models.user import User  # noqa: F401
from app.models.info_step import InfoStep

COUNTRIES = [
    # ── Destinations ──────────────────────────────────────────────────────────
    {
        "code": "US",
        "name": "United States",
        "student_visa_name": "F-1 Student Visa",
        "official_immigration_url": "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
        "currency_code": "USD",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "UK",
        "name": "United Kingdom",
        "student_visa_name": "Student Visa (formerly Tier 4)",
        "official_immigration_url": "https://www.gov.uk/student-visa",
        "currency_code": "GBP",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "CA",
        "name": "Canada",
        "student_visa_name": "Study Permit",
        "official_immigration_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
        "currency_code": "CAD",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "AU",
        "name": "Australia",
        "student_visa_name": "Student Visa (Subclass 500)",
        "official_immigration_url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
        "currency_code": "AUD",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "DE",
        "name": "Germany",
        "student_visa_name": "National Visa for Study Purposes",
        "official_immigration_url": "https://www.auswaertiges-amt.de/en/visa-service/buergerservice/faq/-/606852",
        "currency_code": "EUR",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "FR",
        "name": "France",
        "student_visa_name": "Long-Stay Student Visa (VLS-TS Étudiant)",
        "official_immigration_url": "https://www.campusfrance.org/en/visa",
        "currency_code": "EUR",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "CN",
        "name": "China",
        "student_visa_name": "X1/X2 Student Visa",
        "official_immigration_url": "https://www.mfa.gov.cn/mfa_eng/visa/",
        "currency_code": "CNY",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "JP",
        "name": "Japan",
        "student_visa_name": "Student Visa (College Student)",
        "official_immigration_url": "https://www.mofa.go.jp/j_info/visit/visa/long/index.html",
        "currency_code": "JPY",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "NL",
        "name": "Netherlands",
        "student_visa_name": "MVV / Residence Permit for Study",
        "official_immigration_url": "https://ind.nl/en/residence-permits/study",
        "currency_code": "EUR",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "IE",
        "name": "Ireland",
        "student_visa_name": "Study Visa (C Study / D Study)",
        "official_immigration_url": "https://www.irishimmigration.ie/coming-to-study-in-ireland/",
        "currency_code": "EUR",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "NZ",
        "name": "New Zealand",
        "student_visa_name": "Student Visa",
        "official_immigration_url": "https://www.immigration.govt.nz/new-zealand-visas/visas/visa/student-visa",
        "currency_code": "NZD",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "SG",
        "name": "Singapore",
        "student_visa_name": "Student Pass",
        "official_immigration_url": "https://www.ica.gov.sg/pass-visa/student-pass",
        "currency_code": "SGD",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "KR",
        "name": "South Korea",
        "student_visa_name": "D-2 Student Visa",
        "official_immigration_url": "https://www.hikorea.go.kr/info/InfoDatail_E.pt?CategoryId=5&Lang=en",
        "currency_code": "KRW",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "AE",
        "name": "United Arab Emirates",
        "student_visa_name": "Student Residence Visa",
        "official_immigration_url": "https://u.ae/en/information-and-services/visa-and-emirates-id/types-of-visa/student-visa",
        "currency_code": "AED",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "IT",
        "name": "Italy",
        "student_visa_name": "Student Visa (Type D – Study)",
        "official_immigration_url": "https://vistoperitalia.esteri.it/home/en",
        "currency_code": "EUR",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "IN",
        "name": "India",
        "student_visa_name": "Student Visa",
        "official_immigration_url": "https://indianvisaonline.gov.in/evisa/tvoa.html",
        "currency_code": "INR",
        "is_destination": False,
        "is_origin": True,
    },
    # ── Origin-only ───────────────────────────────────────────────────────────
    {
        "code": "NG",
        "name": "Nigeria",
        "student_visa_name": None,
        "official_immigration_url": "https://immigration.gov.ng/",
        "currency_code": "NGN",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "PK",
        "name": "Pakistan",
        "student_visa_name": None,
        "official_immigration_url": "https://www.nadra.gov.pk/",
        "currency_code": "PKR",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "BD",
        "name": "Bangladesh",
        "student_visa_name": None,
        "official_immigration_url": "https://www.dip.gov.bd/",
        "currency_code": "BDT",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "NP",
        "name": "Nepal",
        "student_visa_name": None,
        "official_immigration_url": "https://www.immigration.gov.np/",
        "currency_code": "NPR",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "UZ",
        "name": "Uzbekistan",
        "student_visa_name": None,
        "official_immigration_url": "https://www.mfa.uz/en/consular/visa/",
        "currency_code": "UZS",
        "is_destination": False,
        "is_origin": False,
    },
    {
        "code": "VN",
        "name": "Vietnam",
        "student_visa_name": None,
        "official_immigration_url": "https://xuatnhapcanh.gov.vn/en",
        "currency_code": "VND",
        "is_destination": False,
        "is_origin": False,
    },
]

# ── India -> US InfoSteps ──────────────────────────────────────────────────────
# Content lives in app/core/content_in_us.py (re-verified 2026-10-13).
from app.core.content_in_us import IN_US_STEPS  # noqa: E402

# ── India -> Canada InfoSteps (study permit) ──────────────────────────────────
# Verified against official IRCC / Government of Canada sources (see
# VERIFY_visa_IN_CA.md) and seeded with is_verified=True. The three originally
# unsourced "MISSING SOURCE" draft steps (health insurance, housing, provincial
# health coverage) were dropped — only steps with an official government source
# are seeded, matching how IN_US_STEPS is sourced. Canada specifics (not copied
# from the US F-1 flow): study permit + TRV, permit printed at the Port of Entry,
# PAL/TAL, GIC proof of funds, biometrics at the IRCC-designated VAC (VFS Global).
IN_CA_STEPS = [
    # ── after_acceptance ──────────────────────────────────────────────────────
    {
        "phase": "after_acceptance",
        "step_number": 1,
        "title": "Receive Your Letter of Acceptance from a Designated Learning Institution (DLI)",
        "explanation": (
            "To study in Canada you must first hold a Letter of Acceptance (LOA) from a "
            "Designated Learning Institution - a school approved by a province or territory to "
            "host international students. Unlike the US Form I-20, the LOA is issued by the "
            "school itself, and your study permit application will require the school's DLI "
            "number from it. Confirm your institution appears on the official DLI list before "
            "you rely on its acceptance, because a permit cannot be approved for a school that "
            "is not a DLI. Keep the original LOA - you will upload it with your application and "
            "carry it when you travel."
        ),
        "official_source_name": "IRCC – Designated Learning Institutions list",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html",
    },
    {
        "phase": "after_acceptance",
        "step_number": 2,
        "title": "Obtain Your Provincial or Territorial Attestation Letter (PAL/TAL)",
        "explanation": (
            "Most study permit applicants must now include a Provincial or Territorial "
            "Attestation Letter (PAL or, in Quebec, a TAL) - a document confirming you are "
            "counted within the province's allocation of study permit applications. This "
            "requirement was introduced in 2024 and has no US F-1 equivalent. The province or "
            "your DLI issues the PAL/TAL; processes differ by province, so follow the "
            "instructions your institution gives you. Without it (where required) IRCC will "
            "return your application, so secure it before you apply."
        ),
        "official_source_name": "IRCC – Provincial/territorial attestation letter",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/provincial-territorial-attestation-letter.html",
    },
    # ── visa_process ──────────────────────────────────────────────────────────
    {
        "phase": "visa_process",
        "step_number": 1,
        "title": "Show Proof of Financial Support (a GIC Is One Accepted Option)",
        "explanation": (
            "You must prove you can pay your tuition and support yourself (and any family "
            "coming with you) in Canada. IRCC lists the acceptable forms of proof - among them "
            "a Guaranteed Investment Certificate (GIC) from a Canadian financial institution, "
            "bank statements, a student or education loan, or proof of paid tuition and "
            "housing. A GIC is a common instrument for Indian applicants but is only one option "
            "(it is not a special stream - the GIC-based Student Direct Stream was discontinued "
            "in November 2024). Check the current required amount and accepted documents on the "
            "official page rather than relying on a fixed figure, as the threshold changes."
        ),
        "official_source_name": "IRCC – Get your documents (proof of funds)",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html",
    },
    {
        "phase": "visa_process",
        "step_number": 2,
        "title": "Create an IRCC Secure Account and Apply for the Study Permit Online",
        "explanation": (
            "Canada has no DS-160 or consular interview for study permits. Instead you create "
            "an IRCC secure online account, complete the study permit application, and upload "
            "your documents (LOA, PAL/TAL, proof of funds, passport, photos, and any others "
            "IRCC requests). Answer the questionnaire honestly; it determines your document "
            "checklist. Apply as early as possible after you have your LOA and PAL/TAL, because "
            "processing times vary by season and country. Submit from within India before you "
            "travel - you cannot get a study permit on arrival without first being approved."
        ),
        "official_source_name": "IRCC – Apply for a study permit",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html",
    },
    {
        "phase": "visa_process",
        "step_number": 3,
        "title": "Complete an Immigration Medical Exam with a Panel Physician (If Required)",
        "explanation": (
            "Depending on your length of stay, intended studies, and where you have lived, you "
            "may need an Immigration Medical Examination (IME). It must be done by an "
            "IRCC-approved panel physician - a regular doctor's check-up is not accepted. Many "
            "applicants from India complete an upfront medical before submitting, which can "
            "speed processing. This is a Canada-specific step with no routine US F-1 "
            "equivalent. Keep the medical confirmation; you may need to quote it in your "
            "application."
        ),
        "official_source_name": "IRCC – Medical exams for visitors, students and workers",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/medical-exams.html",
    },
    {
        "phase": "visa_process",
        "step_number": 4,
        "title": "Pay the Study Permit and Biometrics Fees and Submit",
        "explanation": (
            "Pay the study permit processing fee and the biometrics fee online through your "
            "IRCC account, then submit the application. Keep the payment receipts. After "
            "submission IRCC reviews your file and, if biometrics are required, issues a "
            "Biometric Instruction Letter (BIL) telling you to attend a Visa Application "
            "Centre. Confirm current fee amounts on the official page before paying, as fees "
            "change."
        ),
        "official_source_name": "IRCC – Apply for a study permit",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html",
    },
    {
        "phase": "visa_process",
        "step_number": 5,
        "title": "Give Your Biometrics at the IRCC-Designated Visa Application Centre (VFS Global)",
        "explanation": (
            "Most applicants must provide biometrics - fingerprints and a photo. In India this "
            "is done in person at an IRCC-designated Visa Application Centre operated by VFS "
            "Global, after you receive your Biometric Instruction Letter. Book an appointment, "
            "bring the BIL and your passport, and pay any VAC service fee. Biometrics are a "
            "core part of the Canadian process (there is no SEVIS registration as in the US). "
            "Do this promptly - your application is not complete until your biometrics are "
            "collected."
        ),
        "official_source_name": "IRCC – Biometrics",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/biometrics.html",
    },
    # ── before_departure ──────────────────────────────────────────────────────
    {
        "phase": "before_departure",
        "step_number": 1,
        "title": "Receive Your POE Letter of Introduction and Travel Document (TRV/eTA)",
        "explanation": (
            "If approved, IRCC does NOT send you the study permit itself. You receive a Port of "
            "Entry (POE) Letter of Introduction confirming your approval, and - because Indian "
            "passport holders need a Temporary Resident Visa (TRV) to travel - a TRV counterfoil "
            "placed in your passport (your passport is requested for this). The actual study "
            "permit is printed by a border services officer when you arrive. This is a major "
            "difference from the US, where the visa is stamped before you fly. Review every "
            "detail on the POE letter and TRV for accuracy."
        ),
        "official_source_name": "IRCC – Prepare for your arrival",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html",
    },
    {
        "phase": "before_departure",
        "step_number": 2,
        "title": "Organise the Documents to Carry in Your Hand Luggage for the Port of Entry",
        "explanation": (
            "Carry your key documents in your hand luggage, never checked baggage, to show the "
            "border services officer who will issue your study permit. Bring your passport (with "
            "TRV), your POE Letter of Introduction, your Letter of Acceptance, your PAL/TAL, "
            "proof of financial support, and any medical or other documents IRCC asks for. The "
            "officer reviews these before printing your permit, so missing paperwork at the "
            "border can cause problems. Check the official 'prepare for arrival' guidance for "
            "the current list."
        ),
        "official_source_name": "IRCC – Prepare for your arrival",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html",
    },
    # ── after_arrival ─────────────────────────────────────────────────────────
    {
        "phase": "after_arrival",
        "step_number": 1,
        "title": "Get Your Study Permit at the Port of Entry",
        "explanation": (
            "When you land, a Canada Border Services Agency officer reviews your POE Letter of "
            "Introduction and supporting documents and prints your actual study permit. Check "
            "the permit immediately for errors in your name, date of birth, the DLI, expiry "
            "date, and any conditions (such as work eligibility) before you leave the airport "
            "counter, and ask the officer to correct any mistake. This in-person issuance is the "
            "Canadian equivalent of being formally admitted - there is no separate SEVIS "
            "check-in as in the US. Keep the permit safe; it is your legal status document."
        ),
        "official_source_name": "IRCC – Prepare for your arrival",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare-arrival.html",
    },
    {
        "phase": "after_arrival",
        "step_number": 2,
        "title": "Apply for a Social Insurance Number (SIN) If You Plan to Work",
        "explanation": (
            "To work in Canada - on or off campus - you need a Social Insurance Number, a "
            "nine-digit number issued by Service Canada. You can apply online or in person and "
            "will need your study permit (which must state that you are allowed to work) and "
            "your passport. There is no fee. The SIN is also used when you file taxes. Apply "
            "soon after arrival if you intend to take a job, since employers require it before "
            "you start."
        ),
        "official_source_name": "Service Canada – Social Insurance Number",
        "official_source_url": "https://www.canada.ca/en/employment-social-development/services/sin.html",
    },
    {
        "phase": "after_arrival",
        "step_number": 3,
        "title": "Understand Your On- and Off-Campus Work Conditions",
        "explanation": (
            "Your eligibility to work comes from the conditions printed on your study permit, "
            "not from a separate authorisation. Eligible full-time students at a DLI can work "
            "off campus during the academic term up to the weekly limit IRCC sets (confirm the "
            "current figure on the official page, as it changed recently), and full-time during "
            "scheduled breaks; on-campus work has its own rules. Working outside these "
            "conditions can jeopardise your status, so read your permit and the official "
            "guidance carefully before taking any job."
        ),
        "official_source_name": "IRCC – Work off campus as an international student",
        "official_source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html",
    },
]

# ── India -> UK InfoSteps (Student visa, formerly Tier 4) ──────────────────────
# Verified against official gov.uk / nhs.uk sources (see VERIFY_visa_IN_UK.md) and
# seeded with is_verified=True. The one originally-unsourced "MISSING SOURCE" draft
# step (arrange accommodation) was dropped — only steps with an official government
# source are seeded, matching IN_US_STEPS / IN_CA_STEPS. UK specifics (not copied
# from US/Canada): CAS from a licensed sponsor, Immigration Health Surcharge (IHS),
# UKVI-approved TB test for India, financial maintenance ("28-day rule"), eVisa via
# a UKVI account (BRP phased out), ATAS for some postgraduate subjects, biometrics
# at the UKVI VAC (VFS Global). Money amounts and work-hour limits are deferred to
# the official pages, not hardcoded. Destination code is "UK" (the country row code).
IN_UK_STEPS = [
    # ── after_acceptance ──────────────────────────────────────────────────────
    {
        "phase": "after_acceptance",
        "step_number": 1,
        "title": "Receive Your CAS (Confirmation of Acceptance for Studies) from Your Sponsor",
        "explanation": (
            "Before you can apply for a UK Student visa, your university - which must be a "
            "licensed student sponsor - issues you a Confirmation of Acceptance for Studies "
            "(CAS). This is a unique reference number, not a paper document, and it is the UK "
            "equivalent of the credential a US I-20 or Canadian LOA provides. Your CAS confirms "
            "your course, its dates, your fees, and what you have already paid. You enter the "
            "CAS number in your visa application, so do not apply until your sponsor has issued "
            "it. Check every detail your sponsor lists against your own records and your "
            "passport."
        ),
        "official_source_name": "GOV.UK – Student visa",
        "official_source_url": "https://www.gov.uk/student-visa",
    },
    {
        "phase": "after_acceptance",
        "step_number": 2,
        "title": "Check Whether You Need ATAS (Academic Technology Approval Scheme) Clearance",
        "explanation": (
            "Some students taking certain sensitive postgraduate subjects (often in science, "
            "engineering and technology) must obtain an ATAS certificate before they apply for "
            "the visa. This is a UK-specific requirement with no US or Canadian equivalent. Your "
            "university will normally tell you on your offer or CAS whether your course needs "
            "ATAS, but you should confirm using the official guidance, because applying without "
            "a required ATAS certificate will get your visa refused. If you need it, apply early "
            "- processing takes time and you cannot submit your visa application without it."
        ),
        "official_source_name": "GOV.UK – Academic Technology Approval Scheme (ATAS)",
        "official_source_url": "https://www.gov.uk/guidance/academic-technology-approval-scheme",
    },
    # ── visa_process ──────────────────────────────────────────────────────────
    {
        "phase": "visa_process",
        "step_number": 1,
        "title": "Confirm You Meet the Financial Maintenance Requirement",
        "explanation": (
            "You must show you have enough money to pay your course fees and to support yourself "
            "(living costs) for your studies. UKVI also requires the funds to have been held in "
            "your account for a continuous period before you apply - commonly referred to as the "
            "'28-day rule' - and accepts only certain types of evidence and account holders. The "
            "exact amounts, the qualifying period, and which evidence is accepted change and "
            "depend on your circumstances (for example, studying in or outside London), so "
            "confirm them on the official page rather than relying on a fixed figure. Do not move "
            "the money during the qualifying window. Keep your financial evidence ready to upload."
        ),
        "official_source_name": "GOV.UK – Student visa: Money",
        "official_source_url": "https://www.gov.uk/student-visa/money",
    },
    {
        "phase": "visa_process",
        "step_number": 2,
        "title": "Take the UKVI-Approved Tuberculosis (TB) Test (Required for Applicants in India)",
        "explanation": (
            "If you have been living in India, you must take a tuberculosis (TB) test at a "
            "UKVI-approved clinic and include the certificate with your visa application. A "
            "regular hospital TB test is not accepted - it must be from a clinic on the official "
            "approved list. This requirement is specific to applicants from certain countries, "
            "including India, and has no US F-1 equivalent. The certificate is normally valid "
            "for six months, so plan the test around when you will apply. Find an approved clinic "
            "and book early, as appointments can fill up."
        ),
        "official_source_name": "GOV.UK – Tuberculosis tests for visa applicants",
        "official_source_url": "https://www.gov.uk/tb-test-visa",
    },
    {
        "phase": "visa_process",
        "step_number": 3,
        "title": "Apply Online for the Student Visa and Pay the Visa Fee",
        "explanation": (
            "You apply for the Student visa online on GOV.UK and pay the application fee. There "
            "is no consular interview as in the US. During the application you give your CAS "
            "number, personal details, and travel history, and you upload supporting documents. "
            "You can usually apply up to six months before your course starts. Complete the form "
            "carefully and pay the fee shown on the official page (it changes, so do not rely on "
            "a quoted amount). After paying you will book an appointment to provide your "
            "biometrics."
        ),
        "official_source_name": "GOV.UK – Student visa: How to apply",
        "official_source_url": "https://www.gov.uk/student-visa/apply",
    },
    {
        "phase": "visa_process",
        "step_number": 4,
        "title": "Pay the Immigration Health Surcharge (IHS)",
        "explanation": (
            "As part of your application you pay the Immigration Health Surcharge, which gives "
            "you access to the UK's National Health Service (NHS) during your stay. This is a UK "
            "feature with no US equivalent and is separate from the visa fee. The amount is "
            "charged per year of your visa and is set by the government, so check the current "
            "rate on the official page rather than assuming a figure. You normally pay it within "
            "the online application before you submit. Keep the IHS payment reference."
        ),
        "official_source_name": "GOV.UK – Pay for UK healthcare as part of your immigration application (IHS)",
        "official_source_url": "https://www.gov.uk/healthcare-immigration-application",
    },
    {
        "phase": "visa_process",
        "step_number": 5,
        "title": "Provide Your Biometrics at a UKVI Visa Application Centre (VFS Global)",
        "explanation": (
            "After submitting and paying, you book an appointment to give your biometrics - "
            "fingerprints and a photo. In India this is done in person at a UKVI visa "
            "application centre operated by the official commercial partner, VFS Global. Bring "
            "your passport and the documents UKVI asks for; some centres can scan documents for "
            "you. Depending on the service, you may leave your passport for processing or have "
            "it scanned and returned. Book promptly, as appointment availability varies by city "
            "and season."
        ),
        "official_source_name": "GOV.UK – Student visa: How to apply",
        "official_source_url": "https://www.gov.uk/student-visa/apply",
    },
    # ── before_departure ──────────────────────────────────────────────────────
    {
        "phase": "before_departure",
        "step_number": 1,
        "title": "Receive Your Decision, eVisa and (If Issued) Entry Vignette",
        "explanation": (
            "The UK has moved to eVisas - a digital record of your immigration status - so most "
            "new students no longer receive a Biometric Residence Permit (BRP). When your visa "
            "is granted you get an eVisa accessed through a UKVI account, and you may also "
            "receive a short-validity entry vignette (sticker) in your passport so you can "
            "travel within the window printed on it. Check the decision details carefully. The "
            "exact documents you receive and how to travel on them are explained on the official "
            "eVisa pages - follow those, as this process has changed recently."
        ),
        "official_source_name": "GOV.UK – Get access to your eVisa",
        "official_source_url": "https://www.gov.uk/get-access-evisa",
    },
    {
        "phase": "before_departure",
        "step_number": 2,
        "title": "Set Up Your UKVI Account and Check How to Prove Your Status",
        "explanation": (
            "Create or access your UK Visas and Immigration (UKVI) account so you can view your "
            "eVisa and share your immigration status online when needed - for example with your "
            "university, a landlord, or an employer through the 'view and prove' service. Confirm "
            "you can log in and that your details are correct before you travel. Because the UK "
            "no longer issues a physical card for most students, your online status is how you "
            "prove your right to study, rent and work. Keep your account recovery details safe."
        ),
        "official_source_name": "GOV.UK – View and prove your immigration status",
        "official_source_url": "https://www.gov.uk/view-prove-immigration-status",
    },
    {
        "phase": "before_departure",
        "step_number": 3,
        "title": "Organise the Documents You Must Provide and Carry",
        "explanation": (
            "Make sure you have prepared every document UKVI requires and keep the key ones with "
            "you when you travel rather than in checked baggage. Typical documents include your "
            "passport (with the entry vignette if issued), your CAS details, your financial "
            "evidence, your TB test certificate, and your ATAS certificate if your course needs "
            "one. UK Border Force may ask to see them on arrival. Use the official 'documents you "
            "must provide' guidance to confirm the current list for your circumstances, since "
            "requirements vary by applicant."
        ),
        "official_source_name": "GOV.UK – Student visa: Documents you must provide",
        "official_source_url": "https://www.gov.uk/student-visa/documents-you-must-provide",
    },
    # ── after_arrival ─────────────────────────────────────────────────────────
    {
        "phase": "after_arrival",
        "step_number": 1,
        "title": "Access Your eVisa and Confirm Your Immigration Status",
        "explanation": (
            "Soon after arriving, log in to your UKVI account to confirm your eVisa is active and "
            "correct, and learn how to share it when asked. Because most students no longer "
            "collect a physical BRP, your eVisa is your proof of status for studying, renting and "
            "working. If anything looks wrong - your dates, course, or conditions - follow the "
            "official guidance to get it corrected. Save a copy of your 'share code' process so "
            "you can prove your status quickly when needed."
        ),
        "official_source_name": "GOV.UK – View and prove your immigration status",
        "official_source_url": "https://www.gov.uk/view-prove-immigration-status",
    },
    {
        "phase": "after_arrival",
        "step_number": 2,
        "title": "Complete University Enrolment and Comply with Your Visa Conditions",
        "explanation": (
            "Register (enrol) with your sponsoring university as soon as term arrangements allow "
            "- your sponsor is required to record your enrolment and monitor your engagement, and "
            "your visa depends on you studying the course on your CAS. Your visa also carries "
            "conditions (for example on work and on public funds) that you must follow. Breaching "
            "them, or stopping your studies, can lead to your visa being curtailed. Read the "
            "official overview of what you can and cannot do on a Student visa so you stay "
            "compliant."
        ),
        "official_source_name": "GOV.UK – Student visa (overview and conditions)",
        "official_source_url": "https://www.gov.uk/student-visa",
    },
    {
        "phase": "after_arrival",
        "step_number": 3,
        "title": "Register with a GP for NHS Healthcare",
        "explanation": (
            "Because you paid the Immigration Health Surcharge, you can use the NHS - register "
            "with a local GP (general practitioner) surgery near where you live so you can access "
            "routine healthcare. Registration is free and you do not need proof of address or "
            "immigration status to register with a GP. Do this early rather than waiting until "
            "you are unwell. Your university may also run registration sessions with a local "
            "practice."
        ),
        "official_source_name": "NHS – How to register with a GP surgery",
        "official_source_url": "https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/",
    },
    {
        "phase": "after_arrival",
        "step_number": 4,
        "title": "Understand Your Work Rights as a Student",
        "explanation": (
            "Your Student visa lets you work, but with limits: there is a maximum number of hours "
            "you may work during term time, more is allowed during vacations, and some kinds of "
            "work (such as self-employment or working as a professional sportsperson) are not "
            "permitted. The exact weekly hour limit depends on your course level and is set by "
            "the government, so confirm the current figure on the official page rather than "
            "assuming a number. Working beyond your conditions can end your visa, so check before "
            "taking any job. Your eVisa states or links to your conditions."
        ),
        "official_source_name": "GOV.UK – Student visa: What you can and cannot do",
        "official_source_url": "https://www.gov.uk/student-visa/what-you-can-and-cannot-do",
    },
]


def seed():
    db = SessionLocal()
    try:
        existing_codes = {c.code for c in db.query(Country.code).all()}

        new_countries = []
        for c in COUNTRIES:
            if c["code"] not in existing_codes:
                new_countries.append(Country(**c))
        if new_countries:
            db.add_all(new_countries)
            db.commit()
            print(f"[seed] Inserted {len(new_countries)} countries.")
        else:
            print("[seed] Countries already seeded - skipping.")

        # Sync is_destination / is_origin for all existing rows so re-running
        # seed fixes stale flags without a manual migration.
        live_destinations = {"US", "CA", "UK"}
        live_origins = {"IN"}
        needs_sync = False
        for row in db.query(Country).all():
            want_dest = row.code in live_destinations
            want_orig = row.code in live_origins
            if row.is_destination != want_dest or row.is_origin != want_orig:
                row.is_destination = want_dest
                row.is_origin = want_orig
                needs_sync = True
        if needs_sync:
            db.commit()
            print("[seed] Country flags synced to live corridors (IN->US/CA/UK).")


        # Check if IN->US steps already exist
        existing_steps = (
            db.query(InfoStep)
            .filter(InfoStep.origin_code == "IN", InfoStep.destination_code == "US")
            .count()
        )
        if existing_steps == 0:
            steps = [
                InfoStep(origin_code="IN", destination_code="US", **s)
                for s in IN_US_STEPS
            ]
            db.add_all(steps)
            db.commit()
            print(f"[seed] Inserted {len(steps)} IN->US InfoSteps.")
        else:
            # Sync existing rows (matched on phase + step_number) to the
            # current reviewed content so a re-run applies corrections.
            changed = 0
            rows = {
                (r.phase, r.step_number): r
                for r in db.query(InfoStep).filter(
                    InfoStep.origin_code == "IN", InfoStep.destination_code == "US"
                )
            }
            for step in IN_US_STEPS:
                row = rows.get((step["phase"], step["step_number"]))
                if row is None:
                    db.add(InfoStep(origin_code="IN", destination_code="US", **step))
                    changed += 1
                    continue
                for field, value in step.items():
                    if getattr(row, field) != value:
                        setattr(row, field, value)
                        changed += 1
            db.commit()
            print(f"[seed] IN->US steps synced ({changed} field updates).")

        # Check if IN->CA steps already exist (study permit corridor)
        existing_ca_steps = (
            db.query(InfoStep)
            .filter(InfoStep.origin_code == "IN", InfoStep.destination_code == "CA")
            .count()
        )
        if existing_ca_steps == 0:
            ca_steps = [
                InfoStep(
                    origin_code="IN",
                    destination_code="CA",
                    is_verified=True,
                    **s,
                )
                for s in IN_CA_STEPS
            ]
            db.add_all(ca_steps)
            db.commit()
            print(f"[seed] Inserted {len(ca_steps)} IN->CA InfoSteps.")
        else:
            print("[seed] IN->CA steps already seeded - skipping.")

        # Check if IN->UK steps already exist (Student visa corridor)
        existing_uk_steps = (
            db.query(InfoStep)
            .filter(InfoStep.origin_code == "IN", InfoStep.destination_code == "UK")
            .count()
        )
        if existing_uk_steps == 0:
            uk_steps = [
                InfoStep(
                    origin_code="IN",
                    destination_code="UK",
                    is_verified=True,
                    **s,
                )
                for s in IN_UK_STEPS
            ]
            db.add_all(uk_steps)
            db.commit()
            print(f"[seed] Inserted {len(uk_steps)} IN->UK InfoSteps.")
        else:
            print("[seed] IN->UK steps already seeded - skipping.")

        print("[seed] Done.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
