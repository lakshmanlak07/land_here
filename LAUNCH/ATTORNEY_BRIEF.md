# LandHere — Attorney Brief

> **DRAFT FOR LEGAL REVIEW — NOT APPROVED.** Nothing in this brief or the
> documents it accompanies has been reviewed by a lawyer, and nothing here
> asserts legal compliance.

_Prepared 2026-07-31, revised 2026-08-16 for the restored LandHere Pro purchase.
Send this file plus the documents listed in §1 to a qualified lawyer.
**This brief is not legal advice and does not clear the legal pack — it exists to
make the lawyer's job fast and cheap.**_

_The ordered decision checklist and the covering email live in
`LAUNCH/ATTORNEY_REVIEW_PACKET.md`._

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
| `LAUNCH/ATTORNEY_REVIEW_PACKET.md` | **Start here.** Ordered decision checklist + covering email. |
| `LAUNCH/PRIVACY_POLICY.md` | Draft for legal review. Placeholders flagged inline. |
| `LAUNCH/TERMS_OF_SERVICE.md` | Draft for legal review. Placeholders flagged inline. |
| `DATA_PRACTICES_FINDINGS.md` | Code audit — what the app *actually* does. |
| `LAUNCH/APP_STORE_METADATA.md` | Apple privacy nutrition label as we intend to file it. |

⚠️ `LAUNCH/APP_STORE_LISTING.md` was previously listed here. It has been moved to
`LAUNCH/archive/` as superseded — see that folder's README.

`DATA_PRACTICES_FINDINGS.md` is the important one: it was produced by reading the
codebase, not by describing intentions, so the privacy policy can be checked against
ground truth rather than taken on trust.

---

## 2. Factual basis (verified against code, 2026-06-20 audit + 2026-07-31 re-check)

**Personal data stored** (`users` table): email, bcrypt password hash, optional
full name, optional origin country code, optional destination country code,
onboarding answers, created-at timestamp, random UUID primary key.

**Also stored, and new since the 2026-07-31 version of this brief** — the
`users` table is no longer the only table holding user-linked data:

| Table | Contents | Linked to user |
|---|---|---|
| `refresh_tokens` | session token ids (`jti`), family id, issue/expiry/revoke times. **Never the token itself.** | yes, `ON DELETE CASCADE` |
| `purchases` | Apple's `originalTransactionId` and `transactionId`, product id, sandbox/production flag, purchase date, verify date, revoke date | yes, `ON DELETE CASCADE` |
| `purchase_notifications` | Apple's notification UUID, notification type/subtype, `originalTransactionId`, received-at | **no — see §3.10** |

The first two cascade on account deletion. **`purchase_notifications` does
not**, and that is a deliberate exception to the deletion promise which needs
your view — §3.10. Apple's transaction identifiers are Apple-issued
opaque identifiers, **not** payment instrument data — we never receive a card
number, billing address, or payer name.

`purchases.original_transaction_id` is **UNIQUE**, which is the technical reason
one Apple purchase can entitle only one LandHere account. That constraint has a
legal edge worth your view (§3.7).

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

**Payments:** the app is free to download. One optional non-consumable in-app
purchase, product id `com.landhere.app.pro` (distinct from the app's bundle id,
`com.landhere.app`), USD $1.99 set in App Store Connect, **no subscription**.
Refunds are requested from and decided by Apple. A visible "Restore Purchases"
action exists both on the purchase screen and in Settings.

**What the purchase gates.** Free users keep a genuinely usable app: journey
phases 1–2, the top 25 ranked universities, and the whole of the scholarship
directory, the student work-hour rules, the scoring methodology, country guides
and arrival necessities. Pro adds the remaining journey phases, ranked
universities beyond the top 25, and university detail pages. The gate is enforced
**server-side** — withheld content is never transmitted to a free user's device —
which matters for any representation about what a purchaser receives.

**Verification.** Apple's signed receipt is verified on our server against
Apple's public root certificates using Apple's own library. We hold no Apple
private key or shared secret, and none ships in the app.

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

### 3.7 One purchase, one account — and what deletion does to it
A purchase is recorded against a LandHere account under a UNIQUE constraint on
Apple's `originalTransactionId`, so the same purchase cannot entitle a second
account. Two consequences we need wording for:

- A user who deletes their LandHere account has the purchase record deleted with
  it (that is what the deletion promise requires), but the Apple purchase still
  exists. Restoring it onto a newly created account currently needs manual help.
- A household sharing one Apple ID gets one entitlement. Apple Family Sharing is
  **not** enabled for this product.

**Needed:** whether the current wording in ToS §3 and §5 is adequate, and whether
"permanent access" claims are safe given the deletion interaction.

### 3.8 Cross-border data handling
Origin corridor is India; destinations are the US, Canada and the UK; hosting is
US-region. So personal data of Indian (and possibly EEA/UK) users is stored in
the US. **Needed:** what transfer mechanism or notice is required under the DPDP
Act and, for any EEA/UK users, under GDPR — and whether the app's audience makes
GDPR applicable at all.

### 3.10 The one exception to "we delete everything"
Apple sends server-to-server notifications about purchases (refunds, revocations).
Apple **re-sends** each one until our server confirms receipt, so we keep a log
of notification identifiers we have already processed; without it a re-sent
refund could be applied twice, or a re-sent refund arriving after a
refund-reversal could leave a paying user locked out.

That log is **not** deleted with the account. What survives is Apple's
notification UUID, the notification type, Apple's `originalTransactionId`, and a
timestamp. Once the account and its purchase row are gone, the retained
identifier points at nothing we hold.

**Needed:** whether retaining it is acceptable; whether it must be time-limited
(e.g. purged after Apple's retry window closes); and whether an Apple-issued
transaction identifier is still personal data once the account it referred to has
been deleted. This is the only place our deletion promise is qualified, and we
would rather over-disclose it than have you discover it.

### 3.9 Data retention period
We currently keep account data "for as long as your account exists", with no
fixed retention or inactivity-deletion period, and we have not yet confirmed how
long the hosting provider's backups persist after deletion. **Needed:** whether a
defined retention period is required, and what the policy may say about backups.

---

## 4. What we are NOT asking for

Trademark, entity formation, employment, or tax questions. Scope this to the two
documents and the decisions above.

---

## 5. Publication gate

Neither document may be published, hosted at a public URL, or referenced from App
Store Connect until you have signed off. App Store Connect requires a publicly hosted
privacy policy URL, so this review is on the critical path to submission.
