**DRAFT — NOT LEGAL ADVICE — REQUIRES REVIEW BY A QUALIFIED PERSON BEFORE PUBLISHING.**

# LandHere Privacy Policy (DRAFT)

_Last updated: [DATE] · Contact: [CONTACT EMAIL]_

This policy describes how the LandHere app ("we", "us") handles your information.
It reflects what the app actually does today. Bracketed `[...]` items are
placeholders that need a real value before publishing.

## What we collect

When you create an account, we collect:

- **Email address** (required) — to identify your account and sign you in.
- **Password** (required) — stored only as a one-way **bcrypt hash**; we never keep
  your actual password.
- **Full name** (optional) — only if you choose to provide it.
- **Origin country and destination country** (optional) — the "corridor" you select,
  used to show you relevant guidance.
- **Account creation date** — set automatically.

We also generate a random account identifier and a login token for your session.

**We do not collect:** date of birth, phone number, postal address, profile photo,
government ID or passport details, payment or card information, precise location, or
your contacts. The app has **no document or file upload** (no transcripts, essays, or
IDs).

Your **checklist progress** within the app stays on your device for the current
session only — it is not sent to or stored on our servers.

## How we use your information

- To create and secure your account and sign you in.
- To personalize the content you see (for example, the journey and guidance for your
  selected origin → destination corridor).

We do **not** sell your personal information, and we do **not** use it for advertising.

## What we share, and with whom

We do **not** use any analytics, crash-reporting, advertising, email-marketing, or
social-login services, and we do not share your account information with third
parties for their own purposes.

The app connects to a few external services to show information. These calls do
**not** include your name, email, or account details:

- **Currency rates (Frankfurter / European Central Bank data):** when you use the
  currency converter, the app sends only the currency codes you pick.
- **Photos (Unsplash):** to show city and campus images, the app sends only a search
  term such as a city or university name.

As with any internet request made from your device, these providers can see your
device's IP address. We do not control their handling of that; see their own
policies.

Our university and country information comes from public data sources (U.S. College
Scorecard and OpenAlex). These are fetched in bulk on our side and contain **no user
data** — your information is never sent to them.

We also rely on infrastructure providers to run the app:

- **[Hosting provider — name]** runs our API.
- **[Database/hosting provider — name]** hosts our PostgreSQL database where your
  account information is stored. **[Confirm region/location.]**

## How your information is stored and secured

- Account data is stored in a **PostgreSQL** database.
- Passwords are protected with **bcrypt** hashing and are never stored in readable
  form.
- Your login token is stored on your device in the operating system's secure storage
  (keychain/keystore).
- We apply basic rate limiting to sign-in and registration to slow automated abuse.

We do **not** currently claim or implement application-level encryption of other
stored fields (such as your email or name), AES-256 encryption, formal security
audits, penetration testing, or a fixed breach-notification timeline. _[If/when the
hosting setup provides encryption in transit (HTTPS/TLS) and at rest, state that here
once confirmed — see internal findings; this needs verification before any such
claim is published.]_

## Retention

We keep your account information for as long as your account exists. _[We do not yet
have an automated retention or deletion process. State your intended retention period
here, and do not claim a specific deletion timeline until a real process exists.]_

## Your choices and how to contact us

You can review the information on your account from within the app. **Account
deletion and data export are not yet available in the app** _(planned, not yet
implemented)_. In the meantime, to request access to, correction of, or deletion of
your information, contact us at **[CONTACT EMAIL]** and we will handle the request
manually. _[Describe your actual manual process and expected response time before
publishing.]_

## Children

LandHere is intended for prospective and current university students. You must be at
least **[MINIMUM AGE — PLACEHOLDER]** years old to create an account. We do not
knowingly collect information from anyone under that age, and we do not currently
verify age at sign-up.

> **Flag for the founder + legal review:** the minimum age above is a placeholder.
> Because some prospective students may be minors and the app does not collect a date
> of birth, the appropriate minimum age and any parental-consent requirements
> (e.g. under COPPA, GDPR age-of-consent rules, or India's DPDP Act) need to be
> decided with qualified legal advice.

## Changes to this policy

If we change this policy, we will update the "Last updated" date above and, where
appropriate, notify you in the app. _[Confirm how changes will be communicated.]_

---

_This is a draft generated from a review of the app's code. It must be reviewed by a
qualified person, and all bracketed placeholders resolved, before it is published._
