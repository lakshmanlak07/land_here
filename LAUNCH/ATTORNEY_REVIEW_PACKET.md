# LandHere — Attorney Review Packet

> **DRAFT FOR LEGAL REVIEW — NOT APPROVED.**
> Nothing in this packet is legal advice, and nothing in it asserts that LandHere
> complies with any law. Every document enclosed is a draft awaiting review by a
> qualified lawyer. No document may be published, hosted at a public URL, or
> referenced from App Store Connect before that review is complete.

_Prepared 2026-08-16 · Contact: Lakshman · lakshmanlak07@gmail.com_

---

## 1. What LandHere is, in one paragraph

LandHere is a pre-launch **iOS** app for international students. It walks a
student from accepting a university offer, through the visa process and
departure, to settling in after arrival. It is **information-only**: it gives no
legal or immigration advice, handles no applications, stores no documents, and
every content row links to an official government or institutional source. It is
free to download, with one optional $1.99 one-time purchase. It has never been
released; there are no users yet.

---

## 2. Documents enclosed

| # | File | What it is |
|---|---|---|
| 1 | `LAUNCH/ATTORNEY_BRIEF.md` | Factual background, verified against the source code |
| 2 | `LAUNCH/PRIVACY_POLICY.md` | Draft privacy policy |
| 3 | `LAUNCH/TERMS_OF_SERVICE.md` | Draft terms of service |
| 4 | `DATA_PRACTICES_FINDINGS.md` | Independent code audit of what data the app actually touches |
| 5 | `LAUNCH/APP_STORE_METADATA.md` | Apple privacy "nutrition label" as we intend to file it |

Document 4 is the one to lean on: it was produced by reading the codebase rather
than by describing intentions, so the privacy policy can be checked against
ground truth rather than taken on trust.

**Superseded material** lives in `LAUNCH/archive/` and should be ignored. It is
retained only as history and contains outdated descriptions of the product.

---

## 3. Product facts the documents must match

| Fact | Value |
|---|---|
| Platform | iOS only. No Android release. |
| App bundle identifier | `com.landhere.app` |
| Purchase product identifier | `com.landhere.app.pro` (**different from the bundle id**) |
| Purchase type | One-time, **non-consumable**. Permanent for that Apple account. |
| Price | **US $1.99**, set in App Store Connect; varies by storefront |
| Subscriptions | **None.** No recurring charge of any kind. |
| Restore Purchases | Available on the purchase screen **and** in Settings |
| Seller of record | Apple. Refunds decided by Apple. |
| Refund handling | Apple notifies our server; Pro access ends automatically at that point |
| Free without purchase | Journey phases 1–2; top 25 ranked universities; **the entire scholarship directory**; **the entire student work-hour rules section**; **the scoring methodology**; country guides; arrival necessities; currency and cost tools |
| Pro unlocks | Journey phases 3–5 (visa process, before departure, after arrival); ranked universities beyond the top 25; university detail pages |
| Gate enforcement | **Server-side.** Withheld content is never sent to a free user's device. |
| Ads / analytics / tracking | None of any kind |
| Document upload | None. The app has no file upload at all. |

---

## 4. Decisions we need from you

Ordered by how much they block us. Each is a decision we cannot responsibly make
ourselves.

### 4.1 Minimum age — highest stakes
The audience is university applicants, which **will** include 16- and
17-year-olds. Relevant floors we are aware of: COPPA (US) at 13; GDPR consent
ages varying 13–16 by member state; India's DPDP Act treating under-18s as
children and requiring verifiable parental consent — and India is our launch
corridor's origin country.

**We need:** the minimum age; whether parental consent is required below it; and
whether a self-declared age is defensible.

### 4.2 Parental consent mechanism
If 4.1 requires consent, we need to know what satisfies it. **We currently have
no mechanism at all**, so this may be a build blocker rather than a wording
change. Please flag it as such if so.

### 4.3 Age verification
The app collects **no date of birth** and therefore cannot verify age at sign-up.
Any minimum-age term is a representation by the user, not an enforced control.
**We need:** whether that is acceptable, or whether we must build age collection.

### 4.4 Children's privacy
Given 4.1–4.3, what the privacy policy must say about children, and whether any
COPPA / GDPR-K / DPDP children's provisions require changes to the product rather
than to the wording.

### 4.5 Purchases by minors
Some jurisdictions make a minor's purchase voidable. Apple mediates the
transaction and is the seller of record. **We need:** what we may and may not say
about this, and whether any additional consent step is required.

### 4.6 Refunds
Refunds are requested from and decided by Apple; we cannot issue one. **We need:**
whether our wording is accurate and sufficient, and whether any statutory
withdrawal or cooling-off right (EU/UK consumer law, Indian consumer law) applies
to the purchaser despite Apple being the merchant.

### 4.7 One purchase, one account
A purchase is bound to one LandHere account by a database uniqueness constraint on
Apple's transaction identifier. Consequences: a household sharing an Apple ID gets
one entitlement (Family Sharing is not enabled), and a user who deletes their
LandHere account has the purchase record deleted with it, so restoring onto a new
account currently needs manual help from us.

**We need:** whether the current wording is adequate, and whether describing the
purchase as permanent is safe alongside the deletion behaviour.

### 4.8 Governing law, jurisdiction, venue, dispute resolution
Currently blank. The app targets users worldwide; the origin corridor is India;
Apple is the seller of record; the developer is an individual.

### 4.9 Limitation of liability and warranty disclaimer
The relevant section of the Terms is an intent note, not drafted language. The
commercial reality: a $1.99 one-time, information-only product that gives no
advice and sources every claim to a government page. The worst realistic scenario
is a user relying on out-of-date visa information; content is re-verified on a
90-day cadence.

### 4.10 Data retention and deletion
Account data is kept "for as long as your account exists", with no fixed retention
period and no inactivity deletion. In-app deletion removes the account, sessions
and purchase record. We have **not** yet confirmed how long the hosting
provider's backups persist after deletion.

**We need:** whether a defined retention period is required, and what we may say
about backups.

### 4.11 The one exception to our deletion promise
Apple re-sends purchase notifications (refunds, revocations) until our server
confirms receipt, so we keep a log of which notifications we have already
handled. Without it, a re-sent refund could be applied twice, or a re-sent refund
arriving after a refund-reversal could leave a paying user locked out.

That log is **not** deleted when a user deletes their account. What survives is
Apple's notification identifier, the notification type, Apple's transaction
identifier, and a timestamp — nothing that links back to the person once their
account and purchase row are gone.

**We need:** whether retaining it is acceptable; whether it should be purged
after Apple's retry window; and whether an Apple transaction identifier remains
personal data once the account it referred to has been deleted. Everything else
we hold is deleted on request — this is the single qualification, and we would
rather flag it than have you find it.

### 4.12 Cross-border data handling
Users are expected to be in India, the US, Canada and the UK; hosting is planned
in a US region. **We need:** what transfer mechanism or notice is required under
the DPDP Act, whether GDPR applies given the audience, and what the policy must
say.

### 4.13 "Verified" badge wording
The app marks content a human has checked against the official source, with a
dated last-reviewed stamp. **We need:** confirmation this reads as *provenance*
rather than as a warranty of accuracy or fitness.

---

## 5. Out of scope

Trademark, entity formation, employment, and tax questions. Please scope the
review to the two published-facing documents and the decisions in §4.

---

## 6. Why this is on the critical path

App Store Connect requires a **publicly hosted privacy policy URL** before an app
can be submitted, and our Terms and support pages will be hosted alongside it.
Nothing is published, and no submission is made, until you have signed off.

---

## 7. Covering email — ready to send

> **Subject:** Scoped review request — privacy policy & terms for a pre-launch iOS app (LandHere)
>
> Hello [Name],
>
> I'm looking for a scoped review of two documents for a pre-launch iOS app, not
> a full rewrite. I'd like to understand your fee and rough turnaround before we
> start.
>
> **The product.** LandHere is an information-only companion app for
> international students — it walks someone from a university offer through the
> visa process to arrival. It gives no legal or immigration advice, handles no
> applications, and stores no documents; every piece of content links to the
> official government source it came from. It's free to download with one
> optional $1.99 one-time purchase (no subscription). There are no ads, no
> analytics, and no tracking of any kind. It has not launched and has no users.
>
> **What I'm asking for.** I've attached a packet with drafts of the privacy
> policy and terms of service, plus a code audit describing exactly what data the
> app touches — the drafts were written from the code rather than from
> intentions, so they should be checkable against something concrete rather than
> taken on trust.
>
> There are thirteen open decisions I don't think I can responsibly make myself.
> They're listed and explained in the packet. The ones I'd flag as most important:
>
> - **Minimum age and parental consent.** My users are university applicants, so
>   some will be 16 or 17. My launch corridor starts in India, where the DPDP Act
>   treats under-18s as children. The app collects no date of birth and so cannot
>   verify age. I need to know whether that's defensible or whether I have to
>   build something — if it's a build requirement rather than a wording change,
>   I'd rather find out now.
> - **Governing law, venue, and the limitation of liability**, which are blank.
> - **Cross-border data handling** — Indian users, US hosting.
> - **Refunds and purchases by minors**, given Apple is the seller of record.
> - **Data retention**, where I currently have no defined period — and one
>   deliberate exception to my "delete everything" promise, which I've written up
>   rather than left for you to find.
>
> **Timing.** Apple requires a publicly hosted privacy policy URL before
> submission, so this is on my critical path — but I'd rather it be right than
> fast, and I'm not going to publish anything or submit to Apple until you've
> signed off.
>
> Could you let me know whether this is work you take on, an estimate, and
> anything else you'd want to see?
>
> Thank you,
> Lakshman
> lakshmanlak07@gmail.com

---

## 8. Attachment list for that email

1. `LAUNCH/ATTORNEY_REVIEW_PACKET.md` (this file)
2. `LAUNCH/ATTORNEY_BRIEF.md`
3. `LAUNCH/PRIVACY_POLICY.md`
4. `LAUNCH/TERMS_OF_SERVICE.md`
5. `DATA_PRACTICES_FINDINGS.md`
6. `LAUNCH/APP_STORE_METADATA.md`

Do **not** attach anything from `LAUNCH/archive/`.
