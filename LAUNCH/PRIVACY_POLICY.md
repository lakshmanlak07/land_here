> # DRAFT FOR LEGAL REVIEW — NOT APPROVED, DO NOT PUBLISH
>
> This document has **not** been reviewed by a qualified lawyer. It is a factual
> description of what the code does, written to give counsel something concrete
> to work from. It makes **no claim of legal compliance** with GDPR, COPPA,
> India's DPDP Act, the CCPA, or any other law, and it must not be treated as
> sufficient for publication or App Store submission.
>
> Open items for counsel are listed in `LAUNCH/ATTORNEY_REVIEW_PACKET.md`.
> Placeholders remaining inline: minimum age, hosting provider, backup retention.

# LandHere Privacy Policy

_Draft revised: August 16, 2026 · Contact: lakshmanlak07@gmail.com_

This policy describes how the LandHere app ("we", "us", "our") handles your
information. It is written to reflect what the app actually does today, based on a
review of its code.

## What we collect

When you create an account, we collect:

- **Email address** (required) — to identify your account and sign you in.
- **Password** (required) — stored only as a one-way **bcrypt hash**. We never store
  your actual password.
- **Full name** (optional) — only if you choose to provide it.
- **Origin country and destination country** — the study "corridor" you select, used
  to show you relevant guidance.
- **Your onboarding answers** (all optional) — where you are in your journey (e.g.
  "accepted", "visa process"), what's on your mind (e.g. visa, money, housing),
  whether you plan to work or want scholarships, your first-month priority, whether
  this is your first time abroad, what matters most to you, and how ready you feel.
  These are used only to personalise the order and emphasis of your plan.
- **Account creation date** — set automatically when you register.

We also generate a random account identifier and session login tokens.

**We do not collect:** date of birth, phone number, postal address, profile photo,
gender, government ID or passport details, payment or card information, precise/GPS
location, or your contacts.

**We do not store immigration documents.** The app has no document or file upload of
any kind — no passports, transcripts, essays, financial statements, or IDs.

**We are not an admissions service.** LandHere does not handle university
applications, admissions decisions, essays, or recommendations. It provides
information and step-by-step guidance only.

**Your checklist progress stays on your device.** The steps you mark as done are
saved locally on your phone, not on our servers, and are cleared when you sign out.

## Purchases

LandHere is free to download and free to use. It offers one optional **one-time,
non-consumable in-app purchase** called **LandHere Pro** (product identifier
`com.landhere.app.pro`), priced at **US $1.99** or the equivalent your app store
shows in your country. **There is no subscription and no recurring charge.**

The payment itself is processed entirely by **Apple (App Store)** on iPhone, or
by **Google (Google Play)** on Android. We never see or store your card number,
billing address, or any payment details from either.

**We do record that your account owns Pro.** When you buy or restore Pro, the App
Store gives the app a receipt signed by Apple. The app sends that receipt to our
server, which checks Apple's signature and then stores:

- the store's identifiers for that purchase — Apple's `originalTransactionId`
  and `transactionId`, or Google's purchase token and order id. These are
  random-looking identifiers issued by the store, not payment data
- which store the purchase came from
- the product identifier (`com.landhere.app.pro`)
- whether the purchase came from Apple's production or sandbox environment
- the purchase date, the date we verified it, and — if Apple later tells us the
  purchase was refunded or revoked — that date

This record is linked to your LandHere account. We need that link because Pro
content is withheld by our server, not merely hidden in the app, so the server
has to know which account is entitled. The store's identifier is stored
**uniquely per store**, which means one purchase entitles one LandHere account.

**On Android**, verifying a purchase means our server asks Google whether your
purchase token is valid. That request identifies the purchase, not you — we send
Google no LandHere account information.

- **Restoring:** "Restore Purchases" (on the Pro screen and in Settings) asks
  Apple for your past purchases and re-verifies them with our server.
- **Refunds** are requested from and decided by **Apple**, under Apple's policies.
  We cannot issue, approve, or refuse a refund. Apple notifies our server when a
  refund is granted, and Pro access ends at that point.

**We also keep a short log of the messages Apple sends us** about purchases —
for example, that a particular purchase was refunded. Each entry holds Apple's
message identifier, the type of message, Apple's transaction identifier, and the
time we received it. It contains no name, email, or payment information.

⚠️ _[Lawyer to review — this is the one place our deletion promise is
incomplete.]_ That log is intentionally **not** deleted when you delete your
account. It exists so that if Apple re-sends the same message (which Apple does
until it receives a confirmation), we recognise it as one we have already
handled. After your account is deleted the entry is an orphan: Apple's
transaction identifier with nothing left to connect it to you. We keep it
because deleting it would mean a re-sent message could be processed twice.
- **If you delete your account,** the purchase record above is deleted with it.
  Your purchase still exists in your Apple account, and you can restore it — but
  restoring it onto a *different* LandHere account is not possible while the
  original record exists, because one purchase maps to one account.

_[Lawyer to review: the deletion/restore interaction immediately above, and
whether the one-purchase-one-account rule needs to be stated in the Terms as
well as here.]_

## How we use your information

- To create, secure, and sign you in to your account.
- To personalise the guidance you see (for example, the journey steps and content for
  your selected origin → destination corridor, and the order of features on your
  home screen).

We do **not** sell your personal information, and we do **not** use it for advertising
or profiling. The app contains **no ads and no third-party analytics or tracking**.

## What we share, and with whom

We do not use analytics, crash-reporting, advertising, email-marketing, or
social-login services, and we do not share your account information with third
parties for their own purposes.

**Scholarships and external resources are links only.** Where the app points you to
scholarships or official immigration pages, it simply opens those third-party websites
— we do not submit any of your information to them. Once you follow a link, that
website's own privacy policy applies.

To display certain information, the app makes a few requests directly from your
device. These requests do **not** include your name, email, or account details:

- **Currency rates (Frankfurter / European Central Bank data):** when you use the
  currency converter, the app sends only the currency codes you choose.
- **Photos (Unsplash):** to show city and campus images, the app sends only a search
  term such as a city or university name.

As with any internet request from your device, these providers can see your device's
IP address; we do not control their handling of it — see their own privacy policies.

Our university and country information comes from public data sources (U.S. College
Scorecard and OpenAlex), fetched in bulk on our side. These contain no user data —
your information is never sent to them.

**Apple.** When you buy or restore LandHere Pro, our server verifies Apple's
signed receipt. That verification checks Apple's certificate chain and, as part
of confirming the certificate has not been revoked, contacts Apple. We send Apple
no account information of yours in that request.

We also rely on infrastructure providers to operate the app:

- **[Hosting provider — fill in once production host is chosen (e.g. Railway/Render)]**
  runs our API and hosts the PostgreSQL database where your account information is
  stored. **[Confirm region/location.]**

**Cross-border transfer.** LandHere is aimed at students in India travelling to
the United States, Canada and the United Kingdom, so users are very likely to be
in a different country from where their data is stored. Once the hosting region
is chosen it must be named above, and counsel must decide what transfer mechanism
(if any) is required for users in the EEA/UK and under India's DPDP Act.
_[Lawyer to determine — see the attorney review packet.]_

## How your information is stored and secured

- Account data is stored in a PostgreSQL database.
- Passwords are protected with bcrypt hashing and are never stored in readable form.
- Your login token is stored on your device in the operating system's secure storage
  (keychain/keystore).
- All traffic between the app and our servers uses HTTPS/TLS once deployed to our
  production host. _[Confirm at deploy time before publishing.]_
- We apply rate limiting to sign-in and registration to slow automated abuse.

We do not currently claim application-level encryption of other stored fields,
independent security audits, penetration testing, or a fixed breach-notification
timeline.

## Retention and deletion

We keep your account information for as long as your account exists.

**You can delete your account from within the app** (Profile → Delete account, with
password confirmation). Deleting your account permanently removes your account record
from our database, together with your sign-in sessions and **your LandHere Pro
purchase record**. _[Confirm any short-lived backup retention with your hosting
provider before publishing.]_ You can also contact us at **lakshmanlak07@gmail.com**
for help with access, correction, or deletion requests. We aim to respond within 30
days.

Deleting your LandHere account does **not** cancel or refund your Apple purchase,
and does not delete anything held by Apple. See "Purchases" above for what that
means if you later create a new account.

**One exception to the deletion above,** stated plainly rather than buried: the
log of messages Apple has sent us about purchases is not deleted. It keeps
Apple's transaction identifier but nothing that links it to you once your account
is gone. "Purchases" above explains why. ⚖️ _Lawyer to confirm whether this is
acceptable, whether it must be time-limited, and whether the retained identifier
counts as personal data once the account it referred to no longer exists._

## Children

LandHere is intended for prospective and current university students. **Some users
may be minors.** You must be at least **[MINIMUM AGE — LAWYER TO SET: 13 is the COPPA
floor in the US; GDPR consent ages range 13–16; India's DPDP Act treats under-18s as
children]** years old to create an account. We do not knowingly collect information
from anyone under that age, and we do not currently verify age at sign-up (we do not
collect a date of birth). If we learn we have collected information from a child under
the minimum age, we will delete it.

> **Lawyer review required:** minimum age, parental-consent position, and how
> COPPA / GDPR-K / DPDP children's provisions are satisfied must be decided by
> qualified counsel before this policy is published.

## Your rights

Depending on where you live, you may have rights to access, correct, delete, or
export your personal data (for example under the EU/UK GDPR, India's DPDP Act, or US
state laws such as the CCPA). You can exercise account deletion in the app, and
contact us at **lakshmanlak07@gmail.com** for other requests.

## Changes to this policy

If we change this policy, we will update the "Last updated" date above and, where
appropriate, notify you in the app.

---

_This document was generated from a review of the app's code and reflects its actual
behaviour as of the date above. It is not legal advice and must be reviewed by a
qualified lawyer, with the two remaining placeholders resolved, before publication._
