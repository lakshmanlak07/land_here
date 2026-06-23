**DRAFT — not legal advice, requires review by a qualified lawyer before publishing.**

# LandHere Privacy Policy (DRAFT v2)

_Last updated: [DATE] · Contact: [CONTACT EMAIL]_

This policy describes how the LandHere app ("we", "us", "our") handles your
information. It is written to reflect **what the app actually does today**, based on a
review of its code. Bracketed `[...]` items are placeholders that must be given a real
value before publishing.

## What we collect

When you create an account, we collect only:

- **Email address** (required) — to identify your account and sign you in.
- **Password** (required) — stored only as a one-way **bcrypt hash**. We never store
  your actual password.
- **Full name** (optional) — only if you choose to provide it.
- **Origin country and destination country** (optional) — the study "corridor" you
  select, used to show you relevant guidance.
- **Account creation date** — set automatically when you register.

We also generate a random account identifier and a session login token.

**We do not collect:** date of birth, phone number, postal address, profile photo,
gender, government ID or passport details, payment or card information, precise/GPS
location, or your contacts.

**We do not store immigration documents.** The app has **no document or file upload**
of any kind — no passports, transcripts, essays, financial statements, or IDs.

**We are not an admissions service.** LandHere does not handle university
applications, admissions decisions, essays, or recommendations. It provides
information and step-by-step guidance only.

Your **checklist progress** in the app stays on your device for the current session
only — it is not sent to or stored on our servers.

## How we use your information

- To create, secure, and sign you in to your account.
- To personalize the guidance you see (for example, the journey steps and content for
  your selected origin → destination corridor).

We do **not** sell your personal information, and we do **not** use it for advertising
or profiling.

## What we share, and with whom

We do **not** use analytics, crash-reporting, advertising, email-marketing, or
social-login services, and we do not share your account information with third parties
for their own purposes.

**Scholarships and external resources are links only.** Where the app points you to
scholarships or official immigration pages, it simply opens those third-party websites
— we do not submit any of your information to them. Once you follow a link, that
website's own privacy policy applies.

To display certain information, the app makes a few requests directly from your device.
These requests do **not** include your name, email, or account details:

- **Currency rates (Frankfurter / European Central Bank data):** when you use the
  currency converter, the app sends only the currency codes you choose.
- **Photos (Unsplash):** to show city and campus images, the app sends only a search
  term such as a city or university name.

As with any internet request from your device, these providers can see your device's
IP address; we do not control their handling of it — see their own privacy policies.

Our university and country information comes from **public data sources** (U.S. College
Scorecard and OpenAlex), fetched in bulk on our side. These contain **no user data** —
your information is never sent to them.

We also rely on infrastructure providers to operate the app:

- **[Hosting provider — name]** runs our API.
- **[Database hosting provider — name]** hosts our PostgreSQL database, where your
  account information is stored. **[Confirm region/location.]**

## How your information is stored and secured

- Account data is stored in a **PostgreSQL** database.
- Passwords are protected with **bcrypt** hashing and are never stored in readable form.
- Your login token is stored on your device in the operating system's secure storage
  (keychain/keystore).
- We apply basic **rate limiting** to sign-in and registration to slow automated abuse.

We do **not** currently claim or implement application-level encryption of other stored
fields (such as your email or name), AES-256 encryption, independent security audits,
penetration testing, or a fixed breach-notification timeline. _[If the production
hosting setup provides encryption in transit (HTTPS/TLS) and at rest, state that here
only once it has been confirmed — this needs verification before any such claim is
published.]_

## Retention and deletion

We keep your account information for as long as your account exists.

**You can delete your account from within the app.** Deleting your account removes your
account record from our database. _[Confirm exact scope and any short-lived backup
retention with your hosting/database provider before publishing.]_ You can also contact
us at **[CONTACT EMAIL]** for help with access, correction, or deletion requests.

_[We do not currently run an automated data-retention/expiry process for inactive
accounts. State your intended retention period here, and do not claim a specific
timeline until a real process exists.]_

## Children

LandHere is intended for prospective and current university students. **Some users may
be minors.** You must be at least **[MINIMUM AGE — PLACEHOLDER]** years old to create an
account. We do not knowingly collect information from anyone under that age, and we do
**not** currently verify age at sign-up (we do not collect a date of birth).

> **Flag for the founder + legal review:** the minimum age above is a placeholder.
> Because some prospective students may be minors and the app does not collect a date of
> birth, the appropriate minimum age and any parental-consent requirements (e.g. under
> COPPA, GDPR age-of-consent rules, or India's DPDP Act) must be decided with qualified
> legal advice before launch.

## Your rights

Depending on where you live, you may have rights to access, correct, delete, or export
your personal data (for example under the EU/UK GDPR, India's DPDP Act, or US state
laws such as the CCPA). You can exercise account deletion in the app, and contact us at
**[CONTACT EMAIL]** for other requests. _[Describe your actual process and response
times, and confirm which laws apply to your launch markets, with legal advice.]_

## Changes to this policy

If we change this policy, we will update the "Last updated" date above and, where
appropriate, notify you in the app. _[Confirm how changes will be communicated.]_

---

_This is a DRAFT generated from a review of the app's code and its stated behavior. It
is **not legal advice**. It must be reviewed by a qualified lawyer, and all bracketed
placeholders resolved, before it is published._
