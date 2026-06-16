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
        "is_origin": True,
    },
    {
        "code": "UK",
        "name": "United Kingdom",
        "student_visa_name": "Student Visa (formerly Tier 4)",
        "official_immigration_url": "https://www.gov.uk/student-visa",
        "currency_code": "GBP",
        "is_destination": True,
        "is_origin": True,
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
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "DE",
        "name": "Germany",
        "student_visa_name": "National Visa for Study Purposes",
        "official_immigration_url": "https://www.auswaertiges-amt.de/en/visa-service/buergerservice/faq/-/606852",
        "currency_code": "EUR",
        "is_destination": True,
        "is_origin": True,
    },
    {
        "code": "FR",
        "name": "France",
        "student_visa_name": "Long-Stay Student Visa (VLS-TS Étudiant)",
        "official_immigration_url": "https://www.campusfrance.org/en/visa",
        "currency_code": "EUR",
        "is_destination": True,
        "is_origin": True,
    },
    {
        "code": "CN",
        "name": "China",
        "student_visa_name": "X1/X2 Student Visa",
        "official_immigration_url": "https://www.mfa.gov.cn/mfa_eng/visa/",
        "currency_code": "CNY",
        "is_destination": True,
        "is_origin": True,
    },
    {
        "code": "JP",
        "name": "Japan",
        "student_visa_name": "Student Visa (College Student)",
        "official_immigration_url": "https://www.mofa.go.jp/j_info/visit/visa/long/index.html",
        "currency_code": "JPY",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "NL",
        "name": "Netherlands",
        "student_visa_name": "MVV / Residence Permit for Study",
        "official_immigration_url": "https://ind.nl/en/residence-permits/study",
        "currency_code": "EUR",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "IE",
        "name": "Ireland",
        "student_visa_name": "Study Visa (C Study / D Study)",
        "official_immigration_url": "https://www.irishimmigration.ie/coming-to-study-in-ireland/",
        "currency_code": "EUR",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "NZ",
        "name": "New Zealand",
        "student_visa_name": "Student Visa",
        "official_immigration_url": "https://www.immigration.govt.nz/new-zealand-visas/visas/visa/student-visa",
        "currency_code": "NZD",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "SG",
        "name": "Singapore",
        "student_visa_name": "Student Pass",
        "official_immigration_url": "https://www.ica.gov.sg/pass-visa/student-pass",
        "currency_code": "SGD",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "KR",
        "name": "South Korea",
        "student_visa_name": "D-2 Student Visa",
        "official_immigration_url": "https://www.hikorea.go.kr/info/InfoDatail_E.pt?CategoryId=5&Lang=en",
        "currency_code": "KRW",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "AE",
        "name": "United Arab Emirates",
        "student_visa_name": "Student Residence Visa",
        "official_immigration_url": "https://u.ae/en/information-and-services/visa-and-emirates-id/types-of-visa/student-visa",
        "currency_code": "AED",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "IT",
        "name": "Italy",
        "student_visa_name": "Student Visa (Type D – Study)",
        "official_immigration_url": "https://vistoperitalia.esteri.it/home/en",
        "currency_code": "EUR",
        "is_destination": True,
        "is_origin": False,
    },
    {
        "code": "IN",
        "name": "India",
        "student_visa_name": "Student Visa",
        "official_immigration_url": "https://indianvisaonline.gov.in/evisa/tvoa.html",
        "currency_code": "INR",
        "is_destination": True,
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
        "is_origin": True,
    },
    {
        "code": "PK",
        "name": "Pakistan",
        "student_visa_name": None,
        "official_immigration_url": "https://www.nadra.gov.pk/",
        "currency_code": "PKR",
        "is_destination": False,
        "is_origin": True,
    },
    {
        "code": "BD",
        "name": "Bangladesh",
        "student_visa_name": None,
        "official_immigration_url": "https://www.dip.gov.bd/",
        "currency_code": "BDT",
        "is_destination": False,
        "is_origin": True,
    },
    {
        "code": "NP",
        "name": "Nepal",
        "student_visa_name": None,
        "official_immigration_url": "https://www.immigration.gov.np/",
        "currency_code": "NPR",
        "is_destination": False,
        "is_origin": True,
    },
    {
        "code": "UZ",
        "name": "Uzbekistan",
        "student_visa_name": None,
        "official_immigration_url": "https://www.mfa.uz/en/consular/visa/",
        "currency_code": "UZS",
        "is_destination": False,
        "is_origin": True,
    },
    {
        "code": "VN",
        "name": "Vietnam",
        "student_visa_name": None,
        "official_immigration_url": "https://xuatnhapcanh.gov.vn/en",
        "currency_code": "VND",
        "is_destination": False,
        "is_origin": True,
    },
]

# ── India -> US InfoSteps ──────────────────────────────────────────────────────
IN_US_STEPS = [
    # ── after_acceptance ──────────────────────────────────────────────────────
    {
        "phase": "after_acceptance",
        "step_number": 1,
        "title": "Receive Your Form I-20 from Your University",
        "explanation": (
            "Once you have been admitted, your university's Designated School Official (DSO) "
            "will issue you a Form I-20 - the Certificate of Eligibility for Nonimmigrant "
            "Student Status. This document is the legal foundation of your F-1 visa. Without "
            "it, you cannot pay the SEVIS fee, complete the DS-160 visa application, or attend "
            "your visa interview. The I-20 will arrive by mail or secure electronic delivery, "
            "depending on your school. Guard this document carefully - you will need the "
            "original at your visa interview and when you enter the US."
        ),
        "official_source_name": "Study in the States – DHS",
        "official_source_url": "https://studyinthestates.dhs.gov/students/get-started",
    },
    {
        "phase": "after_acceptance",
        "step_number": 2,
        "title": "Review Your I-20 for Accuracy",
        "explanation": (
            "Before taking any other steps, carefully check every detail on your I-20: your "
            "full legal name (must match your passport exactly), date of birth, program start "
            "and end dates, and your SEVIS ID number (which begins with N). If any information "
            "is wrong, contact your DSO immediately for a corrected I-20. Errors on this form "
            "can cause delays or complications at your visa interview or US port of entry. "
            "The SEVIS ID number on your I-20 is what you will use when paying the SEVIS fee."
        ),
        "official_source_name": "Study in the States – Understanding Your I-20",
        "official_source_url": "https://studyinthestates.dhs.gov/students/prepare/understanding-the-form-i-20",
    },
    # ── visa_process ──────────────────────────────────────────────────────────
    {
        "phase": "visa_process",
        "step_number": 1,
        "title": "Pay the SEVIS I-901 Fee",
        "explanation": (
            "SEVIS stands for Student and Exchange Visitor Information System - the US "
            "government's database that tracks international students. Before you can apply "
            "for your visa, you must pay a fee to register in this system. You pay this "
            "fee directly on the official FMJFEE website using your SEVIS ID from your I-20. "
            "Save your payment confirmation receipt, as you must bring it to your visa "
            "interview. This fee is separate from the visa application fee and is "
            "non-refundable. Payment is accepted by credit/debit card or electronic check."
        ),
        "official_source_name": "SEVIS I-901 Fee Payment – FMJFEE",
        "official_source_url": "https://www.fmjfee.com/i901fee/index.html",
    },
    {
        "phase": "visa_process",
        "step_number": 2,
        "title": "Complete the DS-160 Online Visa Application",
        "explanation": (
            "The DS-160 is the US government's official online nonimmigrant visa application "
            "form. You complete it on the Consular Electronic Application Center (CEAC) "
            "website. It collects your personal background, travel history, purpose of travel, "
            "and security-related questions. At the end, you will receive a DS-160 barcode "
            "confirmation page - print this and bring it to your interview. Take your time "
            "answering accurately; your interview officer will have access to your DS-160 "
            "responses. Do not leave the application idle for long as it may time out."
        ),
        "official_source_name": "DS-160 Online Application – CEAC",
        "official_source_url": "https://ceac.state.gov/genniv/",
    },
    {
        "phase": "visa_process",
        "step_number": 3,
        "title": "Pay the MRV Visa Application Fee",
        "explanation": (
            "The Machine Readable Visa (MRV) fee is the non-refundable fee charged by the "
            "US government for processing your visa application. For applicants in India, "
            "this fee is paid through the US Travel Docs portal, which manages US visa "
            "appointments in India. After paying, you will receive a payment receipt with "
            "a unique barcode that you need to schedule your interview. Keep this receipt "
            "safe - you will present it at the consulate on the day of your interview."
        ),
        "official_source_name": "US Travel Docs – India",
        "official_source_url": "https://www.ustraveldocs.com/in/en/step-2",
    },
    {
        "phase": "visa_process",
        "step_number": 4,
        "title": "Schedule Your Visa Interview at a US Consulate in India",
        "explanation": (
            "After paying the MRV fee, you schedule your F-1 visa interview through the "
            "US Travel Docs portal. There are US consulates and the embassy in India at "
            "multiple locations - Mumbai, Delhi, Chennai, Hyderabad, and Kolkata. Choose "
            "the location most convenient for you. Interview slots can fill up quickly, "
            "especially during peak summer application season (March–June for fall enrollment), "
            "so schedule as early as possible after receiving your I-20. You will select a "
            "date and time on the portal and receive a confirmation."
        ),
        "official_source_name": "US Travel Docs – Schedule Appointment (India)",
        "official_source_url": "https://www.ustraveldocs.com/in/en/step-3",
    },
    {
        "phase": "visa_process",
        "step_number": 5,
        "title": "Attend the F-1 Visa Interview",
        "explanation": (
            "On your interview day, arrive at the US consulate with all required documents: "
            "your valid passport, DS-160 confirmation page, MRV fee receipt, SEVIS I-901 fee "
            "receipt, printed I-20, university admission letter, financial evidence showing you "
            "can support yourself during your studies, and a recent passport-size photo. The "
            "interview itself is typically brief - a few minutes - and a consular officer will "
            "ask about your study plans, financial situation, and ties to India. If approved, "
            "your passport will be retained for visa stamping and returned to you, usually "
            "within a few business days via courier."
        ),
        "official_source_name": "US Visa Interview – travel.state.gov",
        "official_source_url": "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/prepare-for-your-interview.html",
    },
    # ── before_departure ──────────────────────────────────────────────────────
    {
        "phase": "before_departure",
        "step_number": 1,
        "title": "Arrange Housing Before You Arrive",
        "explanation": (
            "Secure your housing before leaving India - arriving without a confirmed address "
            "is stressful and risky, as off-campus rentals can be competitive and expensive "
            "last-minute. Most universities offer on-campus housing for new international "
            "students; apply through your university's housing portal as soon as you are "
            "admitted. If you opt for off-campus housing, research options thoroughly and "
            "confirm the lease in writing before you travel. You will need a US address for "
            "your Social Security Number application and other administrative tasks when you arrive."
        ),
        "official_source_name": "Study in the States – Prepare for Departure",
        "official_source_url": "https://studyinthestates.dhs.gov/students/prepare/prepare-for-departure",
    },
    {
        "phase": "before_departure",
        "step_number": 2,
        "title": "Obtain Health Insurance Coverage",
        "explanation": (
            "Most US universities require international students to have health insurance, and "
            "many automatically enroll you in their student health plan. Healthcare in the US "
            "is very expensive without insurance - even a routine doctor visit can be costly. "
            "Check whether your university has a mandatory insurance program, and if so, "
            "review what it covers. If you are purchasing your own plan, ensure it is valid "
            "in the US and meets your school's minimum coverage requirements. Carry proof of "
            "insurance with you when you travel."
        ),
        "official_source_name": "Study in the States – Health Insurance",
        "official_source_url": "https://studyinthestates.dhs.gov/students/prepare/health-insurance-and-your-f-and-m-student-status",
    },
    {
        "phase": "before_departure",
        "step_number": 3,
        "title": "Book Your Flight Within the Allowed Entry Window",
        "explanation": (
            "Your F-1 visa allows you to enter the United States no earlier than 30 days "
            "before the program start date listed on your I-20. Arriving too early means you "
            "may be denied entry at the border. Check your I-20 for the program start date "
            "and plan your travel accordingly. Book your flights through a reputable airline "
            "or travel agent. Keep your flight booking confirmation to present at the US "
            "port of entry if asked."
        ),
        "official_source_name": "Study in the States – Entering the US",
        "official_source_url": "https://studyinthestates.dhs.gov/students/prepare/entering-the-united-states",
    },
    {
        "phase": "before_departure",
        "step_number": 4,
        "title": "Organise the Documents You Must Carry in Your Hand Luggage",
        "explanation": (
            "When you travel to the US, carry all critical documents in your hand luggage - "
            "never check them in. You must have with you: your valid passport (with F-1 visa), "
            "your original signed I-20, your SEVIS I-901 fee payment receipt, your university "
            "acceptance letter, proof of financial support (bank statements), housing "
            "confirmation, health insurance proof, and your DS-160 confirmation page. At the "
            "US port of entry (airport immigration), a Customs and Border Protection (CBP) "
            "officer will review these documents and officially admit you into the country."
        ),
        "official_source_name": "Study in the States – Documents to Carry",
        "official_source_url": "https://studyinthestates.dhs.gov/students/prepare/documents-to-carry-when-entering-the-united-states",
    },
    # ── after_arrival ─────────────────────────────────────────────────────────
    {
        "phase": "after_arrival",
        "step_number": 1,
        "title": "Report to Your University's International Student Office",
        "explanation": (
            "Within a day or two of arriving, visit your university's International Student "
            "and Scholar Services (ISSS) or equivalent office. This is a required step - "
            "your school's DSO needs to verify your arrival and update your SEVIS record. "
            "Bring your original I-20, passport, and visa. The ISSS office is also your "
            "primary resource for questions about maintaining your student status, work "
            "authorisation, travel, and any changes to your program."
        ),
        "official_source_name": "Study in the States – Reporting to Your DSO",
        "official_source_url": "https://studyinthestates.dhs.gov/students/study/report-to-your-dso",
    },
    {
        "phase": "after_arrival",
        "step_number": 2,
        "title": "Complete Your SEVIS Check-In",
        "explanation": (
            "Your DSO is required to update your record in the SEVIS database to confirm "
            "that you have arrived and begun your studies. This happens automatically when "
            "you report to the ISSS office. If your SEVIS record is not updated in time, "
            "your student status can be at risk. Make this your top priority in the first "
            "week. You can monitor your SEVIS status through the Study in the States portal "
            "once you have access."
        ),
        "official_source_name": "Study in the States – SEVIS",
        "official_source_url": "https://studyinthestates.dhs.gov/students/study/sevis-check-in",
    },
    {
        "phase": "after_arrival",
        "step_number": 3,
        "title": "Open a US Bank Account",
        "explanation": (
            "Having a US bank account is essential for paying rent, tuition, and everyday "
            "expenses without incurring international transfer or foreign transaction fees. "
            "Most US banks allow students to open a basic checking account with your passport, "
            "I-20, and a US address. Some banks, such as Bank of America and Chase, have "
            "campus branches that are experienced with international student accounts. "
            "Some fintech apps (like Wise or Revolut) also offer US account numbers without "
            "a Social Security Number, which can be useful before you obtain your SSN."
        ),
        "official_source_name": "Consumer Financial Protection Bureau – Banking Basics",
        "official_source_url": "https://www.consumerfinance.gov/consumer-tools/banking/",
    },
    {
        "phase": "after_arrival",
        "step_number": 4,
        "title": "Get a US SIM Card",
        "explanation": (
            "Having a local US phone number is practically necessary for setting up bank "
            "accounts, registering with your university, and day-to-day life. Major carriers "
            "include AT&T, T-Mobile, and Verizon, with prepaid options available at most "
            "convenience stores and carrier retail locations - no SSN is required for prepaid "
            "plans. Many students opt for prepaid plans initially, then switch to a postpaid "
            "plan once they have established some US credit history. Coverage and price vary "
            "by carrier and your campus location."
        ),
        "official_source_name": "FCC – Choosing a Wireless Carrier",
        "official_source_url": "https://www.fcc.gov/consumers/guides/choosing-wireless-carrier-or-reseller",
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

        # Check if IN->US steps already exist
        existing_steps = (
            db.query(InfoStep)
            .filter(InfoStep.origin_code == "IN", InfoStep.destination_code == "US")
            .count()
        )
        if existing_steps == 0:
            steps = [
                InfoStep(
                    origin_code="IN",
                    destination_code="US",
                    is_verified=False,
                    **s,
                )
                for s in IN_US_STEPS
            ]
            db.add_all(steps)
            db.commit()
            print(f"[seed] Inserted {len(steps)} IN->US InfoSteps.")
        else:
            print("[seed] IN->US steps already seeded - skipping.")

        print("[seed] Done.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
