**FINAL DRAFT (v3) — ready for lawyer sign-off. Two placeholders remain (minimum age, hosting provider) and are flagged inline. Do not publish until a qualified lawyer has reviewed this document.**

# LandHere Privacy Policy

_Last updated: July 2, 2026 · Contact: lakshmanlak07@gmail.com_

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

LandHere offers a single, optional **one-time in-app purchase** (US $1.99, or the
equivalent price your app store shows) that unlocks the full journey and premium
features. The purchase is processed entirely by **Apple (App Store)** or **Google
(Google Play)**:

- We never see or store your card number or payment details.
- We do not link your purchase to your LandHere account on our servers; the unlock
  status is stored on your device, and you can restore it on a new device through
  your Apple ID / Google account ("Restore Purchases" in the app).
- Refunds are handled by Apple or Google under their store policies.

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

We also rely on infrastructure providers to operate the app:

- **[Hosting provider — fill in once production host is chosen (e.g. Railway/Render)]**
  runs our API and hosts the PostgreSQL database where your account information is
  stored. **[Confirm region/location.]**

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
from our database. _[Confirm any short-lived backup retention with your hosting
provider before publishing.]_ You can also contact us at **lakshmanlak07@gmail.com**
for help with access, correction, or deletion requests. We aim to respond within 30
days.

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
