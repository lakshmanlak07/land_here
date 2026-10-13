"""
India -> United States (F-1) journey content.

Rewritten 2026-10-13 against current official pages; every claim below is
limited to what the cited page states. Per-step results, reviewer notes and
the pages that could NOT be checked are recorded in VERIFY_visa_india_us.md.

is_verified=True  — each claim was checked against the cited page on the
                    review date.
is_verified=False — general guidance with no authoritative government source,
                    a source the reviewer could not access, or content that
                    needs qualified (legal) review. The app labels these.
Not legal or immigration advice.
"""

REVIEWED_ON = "2026-10-13"

_DHS_I20 = "https://studyinthestates.dhs.gov/students/prepare/students-and-the-form-i-20"
_DHS_ARRIVAL = "https://studyinthestates.dhs.gov/students/travel/getting-to-the-united-states"
_DHS_RULE = (
    "https://studyinthestates.dhs.gov/final-rule-establishing-a-fixed-time-period-of-"
    "admission-and-an-extension-of-stay-procedure-quick"
)
_DHS_SCHOOLS = "https://studyinthestates.dhs.gov/school-search"

IN_US_STEPS = [
    # ── after_acceptance ──────────────────────────────────────────────────────
    {
        "phase": "after_acceptance",
        "step_number": 1,
        "title": "Receive and Sign Your Form I-20",
        "explanation": (
            "Once you are accepted by a school certified by the Student and Exchange "
            "Visitor Program (SEVP), its designated school official (DSO) issues you a "
            "Form I-20, \"Certificate of Eligibility for Nonimmigrant Student Status.\" "
            "You need it to pay the I-901 SEVIS fee, apply for your F-1 visa and enter the "
            "US. You and your DSO must both sign it (if you are under 18, a parent signs "
            "for you). Keep the original safe: you are expected to bring it to your visa "
            "interview and to carry it with you, not in checked luggage, when you arrive."
        ),
        "official_source_name": "Study in the States (DHS) – Students and the Form I-20",
        "official_source_url": _DHS_I20,
        "is_verified": True,
    },
    {
        "phase": "after_acceptance",
        "step_number": 2,
        "title": "Check the Details on Your I-20",
        "explanation": (
            "Read your I-20 carefully: your personal details, your program and its start "
            "date. If anything is wrong, ask your DSO for a new I-20; DSOs issue a new form "
            "for changes to your personal information or program of study. Note two "
            "numbers you will need to pay the SEVIS fee: your SEVIS Identification Number "
            "and the School Code. The program start date also matters for travel: you may "
            "enter the US up to 30 days before it."
        ),
        "official_source_name": "Study in the States (DHS) – Students and the Form I-20",
        "official_source_url": _DHS_I20,
        "is_verified": True,
    },
    # ── visa_process ──────────────────────────────────────────────────────────
    {
        "phase": "visa_process",
        "step_number": 1,
        "title": "Pay the I-901 SEVIS Fee",
        "explanation": (
            "You must pay the I-901 SEVIS fee before the US can issue your student visa. "
            "Pay it on FMJfee.com, the official payment site. You will need your name, "
            "address, date of birth, email, country of birth and citizenship, plus the "
            "School Code and SEVIS ID from your I-20. Students from India can pay by "
            "credit card online, and someone else may pay on your behalf. Print the "
            "payment confirmation: you must show proof of payment at your visa interview. "
            "Check the current fee amount on FMJfee.com before you pay."
        ),
        "official_source_name": "Study in the States (DHS) – Paying the I-901 SEVIS Fee",
        "official_source_url": "https://studyinthestates.dhs.gov/students/prepare/paying-the-i-901-sevis-fee",
        "is_verified": True,
    },
    {
        "phase": "visa_process",
        "step_number": 2,
        "title": "Complete the DS-160 Online Visa Application",
        "explanation": (
            "Complete and submit Form DS-160, the online nonimmigrant visa application, "
            "before you book your appointment. Every applicant needs their own. Answer "
            "every question accurately and in English: signing it electronically "
            "certifies that it is true, and misrepresenting facts can make you ineligible. "
            "Write down your Application ID, because the session expires after 20 minutes "
            "of inactivity. Print the barcode confirmation page (the number starts with "
            "AA): you need it to book your appointment and must bring it to the Visa "
            "Application Center and the interview, and it must match the one you booked with."
        ),
        "official_source_name": "U.S. Visa Appointment Service India (State Dept.) – Complete your application",
        "official_source_url": "https://www.ustraveldocs.com/in/en/step-2",
        "is_verified": True,
    },
    {
        "phase": "visa_process",
        "step_number": 3,
        "title": "Pay the Visa Application (MRV) Fee",
        "explanation": (
            "Pay the visa application fee, also called the MRV fee, through the official "
            "US visa appointment service for India. The fee for F student visas is listed "
            "there in US dollars and paid in Indian rupees, by NEFT, UPI, debit or credit "
            "card, or cash at the listed banks. It is non-refundable whether or not a visa "
            "is issued. Your payment is valid for 365 days, and you must schedule your "
            "appointment within that period. If a payment seems to have failed, do not pay "
            "a second time: contact the support centre listed on the site."
        ),
        "official_source_name": "U.S. Visa Appointment Service India (State Dept.) – Pay your visa fees",
        "official_source_url": "https://www.ustraveldocs.com/in/en/step-3",
        "is_verified": True,
    },
    {
        "phase": "visa_process",
        "step_number": 4,
        "title": "Book Your Biometrics and Interview Appointments",
        "explanation": (
            "Book two appointments online: one at a Visa Application Center (VAC), where "
            "your fingerprints and photo are taken, and your interview at the US Embassy "
            "in New Delhi or a US Consulate in Mumbai, Chennai, Hyderabad or Kolkata. The "
            "VAC appointment must be at least 2 business days before the interview. Apply "
            "in your country of residence or nationality. Book early: applicants are "
            "encouraged to apply at least three months before travel, and the site shows "
            "current wait times for each city. F-1 visas can be issued up to 365 days "
            "before your program start date."
        ),
        "official_source_name": "U.S. Visa Appointment Service India (State Dept.) – Schedule your appointment",
        "official_source_url": "https://www.ustraveldocs.com/in/en/step-4",
        "is_verified": True,
    },
    {
        "phase": "visa_process",
        "step_number": 5,
        "title": "Attend Your Visa Interview",
        "explanation": (
            "Attend your interview in person. Missing it marks you as a \"No Show\", and you "
            "would have to pay a new fee and start again. Bring your passport (valid for at "
            "least six months beyond your intended stay), your printed DS-160 confirmation, "
            "your I-20 and your SEVIS fee receipt, plus the other documents the State "
            "Department lists for student visas, such as evidence of how you will pay for "
            "your studies. Phones, smartwatches, large bags and food are not allowed inside, "
            "and there is nowhere to store them. The US Mission in India instructs F-1 "
            "applicants to set the privacy setting on all social media accounts to public. "
            "If more information is needed, you may receive a 221(g) letter explaining what "
            "to submit."
        ),
        "official_source_name": "U.S. Visa Appointment Service India (State Dept.) – Attend your interview",
        "official_source_url": "https://www.ustraveldocs.com/in/en/step-5",
        # travel.state.gov (student document list) sits behind a CAPTCHA the
        # reviewer could not pass. See VERIFY_visa_india_us.md.
        "is_verified": False,
    },
    # ── before_departure ──────────────────────────────────────────────────────
    {
        "phase": "before_departure",
        "step_number": 1,
        "title": "Arrange Housing Through Your University",
        "explanation": (
            "Housing is arranged through your university or privately, not through the US "
            "government. Check your university's housing office for on-campus options and "
            "deadlines. If you rent off-campus, get the lease terms in writing before you "
            "travel. Having an address ready makes your first weeks easier."
        ),
        "official_source_name": "Study in the States (DHS) – School Search (find your school's website)",
        "official_source_url": _DHS_SCHOOLS,
        "is_verified": False,  # general guidance; no government source covers housing
    },
    {
        "phase": "before_departure",
        "step_number": 2,
        "title": "Check Your University's Health Insurance Requirement",
        "explanation": (
            "Health insurance requirements for international students are set by each "
            "university, not by a single US government rule. Many schools require coverage "
            "or enrol students in a school plan automatically. Check your university's rules "
            "and what its plan covers before you travel. Medical care in the US can be very "
            "expensive without insurance."
        ),
        "official_source_name": "Study in the States (DHS) – School Search (find your school's website)",
        "official_source_url": _DHS_SCHOOLS,
        "is_verified": False,  # school-specific; no government source
    },
    {
        "phase": "before_departure",
        "step_number": 3,
        "title": "Plan Your Arrival Within the 30-Day Window",
        "explanation": (
            "You may enter the US up to 30 days before the program start date on your "
            "I-20, but not earlier. DHS's 2026 final rule keeps this 30-day arrival period. "
            "Book your travel around that date. If you will be late or cannot arrive for the "
            "term on your I-20, contact your DSO immediately so they can update your SEVIS "
            "record."
        ),
        "official_source_name": "Study in the States (DHS) – Getting to the United States",
        "official_source_url": _DHS_ARRIVAL,
        "is_verified": True,
    },
    {
        "phase": "before_departure",
        "step_number": 4,
        "title": "Carry Your Key Documents in Your Hand Luggage",
        "explanation": (
            "Carry your passport, visa and signed Form I-20 with you, not in checked "
            "baggage. A Customs and Border Protection (CBP) officer will ask you to present "
            "your I-20 at the port of entry. DHS recommends making at least two sets of "
            "copies: one to leave with your family and one to give to your school officials."
        ),
        "official_source_name": "Study in the States (DHS) – Getting to the United States",
        "official_source_url": _DHS_ARRIVAL,
        "is_verified": True,
    },
    # ── after_arrival ─────────────────────────────────────────────────────────
    {
        "phase": "after_arrival",
        "step_number": 1,
        "title": "Report to Your School by the Program Start Date",
        "explanation": (
            "You must report to your school by the program start date on your I-20. If you "
            "do not, you are not maintaining your student status. Contact your school's "
            "international student office as soon as you arrive so there is no question "
            "about your arrival. Your DSO is also your main contact for questions about "
            "maintaining your status."
        ),
        "official_source_name": "Study in the States (DHS) – Getting to the United States",
        "official_source_url": _DHS_ARRIVAL,
        "is_verified": True,
    },
    {
        "phase": "after_arrival",
        "step_number": 2,
        "title": "Check Your I-94 Record and Your Admit Until Date",
        "explanation": (
            "When you arrive by air, CBP creates an electronic Form I-94 arrival record. You "
            "can retrieve it on the official I-94 website. Check that the details are "
            "correct: DHS notes that mismatches between your I-94 and SEVIS record can cause "
            "problems, for example when applying for a Social Security number. Under a DHS "
            "final rule published July 17, 2026, F students are admitted for a fixed period, "
            "ending on an \"Admit Until Date\", instead of \"duration of status\". If you will "
            "need more time, talk to your DSO well before that date. How the rule applies "
            "depends on your circumstances, so ask your DSO."
        ),
        "official_source_name": "Study in the States (DHS) – Fixed Time Period of Admission: Quick Facts",
        "official_source_url": _DHS_RULE,
        # Text matches DHS pages; the rule's status after congressional review
        # needs qualified review before this is marked verified.
        "is_verified": False,
    },
    {
        "phase": "after_arrival",
        "step_number": 3,
        "title": "Open a US Bank Account",
        "explanation": (
            "A US bank account makes it easier to pay rent and everyday costs. Requirements "
            "vary by bank, so ask your bank which documents it accepts from international "
            "students and compare account fees before you choose. Your international "
            "student office can usually suggest banks near campus."
        ),
        "official_source_name": "Consumer Financial Protection Bureau – Bank accounts and services",
        "official_source_url": "https://www.consumerfinance.gov/consumer-tools/bank-accounts/",
        "is_verified": False,  # general guidance; CFPB covers banking basics only
    },
    {
        "phase": "after_arrival",
        "step_number": 4,
        "title": "Get a US Phone Number",
        "explanation": (
            "A US phone number helps with banking, university systems and daily life. "
            "Prepaid and monthly plans are both available, and coverage and price vary by "
            "carrier and campus location. Compare plans before you commit."
        ),
        "official_source_name": "Federal Communications Commission – Consumer Guides",
        "official_source_url": "https://www.fcc.gov/consumer-guides",
        "is_verified": False,  # general guidance
    },
]
