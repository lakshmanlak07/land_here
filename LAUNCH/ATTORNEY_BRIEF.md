# LandHere — Attorney Brief

_Prepared 2026-07-31 for Lakshman. Send this file plus the four documents listed in
§1 to a qualified lawyer. **This brief is not legal advice and does not clear the
legal pack — it exists to make the lawyer's job fast and cheap.**_

---

## 0. What we need from you (the lawyer), in one paragraph

LandHere is a pre-launch iOS app for international students. It is **information-only**:
it never gives legal or immigration advice, and every content row links to an official
government source. We need six specific decisions made (§3) and the resulting language
dropped into two documents. Everything else in those documents is already drafted and
factually verified against the codebase (§2). We are targeting App Store submission
within days, so a scoped review — not a rewrite — is what we're asking for.

---

## 1. Documents enclosed

| File | Status |
|---|---|
| `LAUNCH/PRIVACY_POLICY.md` | Final draft v3. Two placeholders flagged inline. |
| `LAUNCH/TERMS_OF_SERVICE.md` | Final draft v2. Four placeholders flagged inline. |
| `DATA_PRACTICES_FINDINGS.md` | Code audit — what the app *actually* does. |
| `LAUNCH/APP_STORE_LISTING.md` | Apple privacy nutrition label as we intend to file it. |

`DATA_PRACTICES_FINDINGS.md` is the important one: it was produced by reading the
codebase, not by describing intentions, so the privacy policy can be checked against
ground truth rather than taken on trust.

---

## 2. Factual basis (verified against code, 2026-06-20 audit + 2026-07-31 re-check)

**Personal data stored** (`users` table, the only table holding user data):
email, bcrypt password hash, optional full name, optional origin country code,
optional destination country code, created-at timestamp, random UUID primary key.

**Explicitly NOT collected anywhere in the codebase:** date of birth, age, phone
number, postal address, profile photo, gender, government ID or passport number,
payment or card data, precise location/GPS, contacts.

**Consequence worth flagging:** because no date of birth is collected, the app
**cannot verify age at sign-up**. Any minimum-age term is a contractual
representation by the user, not an enforced control. This is the crux of §3.1.

**Third parties contacted:** Unsplash (image search strings only, no user data),
Frankfurter / European Central Bank (currency rates, no user data), U.S. College
Scorecard and OpenAlex (public university data, ingested server-side ahead of time,
no user data). Payments are handled entirely by Apple; we never see card data.

**Payments:** one non-consumable in-app purchase, `com.landhere.app.pro`, USD $1.99,
no subscription. Refunds are requested from and decided by Apple.

**Hosting:** Render (US region), managed PostgreSQL, TLS terminated at the platform.
_This resolves the "hosting provider" placeholder in the privacy policy — please
confirm the region wording once the production instance is live._

---

## 3. Decisions only you can make

### 3.1 Minimum age — the highest-stakes item
The audience is international students, which **will** include 16- and 17-year-olds
applying to university. Relevant floors: COPPA (US) is 13; GDPR consent ages range
13–16 by member state; India's DPDP Act treats under-18s as children and requires
verifiable parental consent, and India is our launch corridor's origin country.
**Needed:** the number, whether parental consent is required below it, and whether
"we do not verify age" is defensible given the DPDP position.

### 3.2 Parental-consent mechanism
If §3.1 requires consent, we need to know what satisfies it, because we currently
have no mechanism at all — this could be a build blocker, not just a wording change.

### 3.3 Purchases by minors
Some jurisdictions make minors' purchases voidable. Apple mediates the transaction;
we need to know what we can and cannot say about it.

### 3.4 Governing law, jurisdiction, venue, dispute resolution
Currently blank. Note the app targets users worldwide, seller of record is Apple.

### 3.5 Limitation of liability and warranty disclaimer
Section 9 of the ToS is an intent note, not drafted language. The commercial reality:
$1.99 one-time, information-only product, no advice given, every claim sourced to a
government page. Worst realistic case is a user relying on out-of-date visa
information — the re-verification cadence is 90 days.

### 3.6 "Verified" badge wording
The app shows a verified badge where a human has checked content against the official
source, with a dated last-reviewed stamp. We want to be sure this reads as
*provenance*, not as a warranty of accuracy or fitness.

---

## 4. What we are NOT asking for

Trademark, entity formation, employment, or tax questions. Scope this to the two
documents and the six decisions above.

---

## 5. Publication gate

Neither document may be published, hosted at a public URL, or referenced from App
Store Connect until you have signed off. App Store Connect requires a publicly hosted
privacy policy URL, so this review is on the critical path to submission.
