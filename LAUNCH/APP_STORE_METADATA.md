# App Store Connect metadata — LandHere v1.0.0 (FREE)

_Prepared 2026-08-01 for `v0.1.0-rc.3`._

**This file supersedes `LAUNCH/APP_STORE_LISTING.md`**, which still carries rc.1
copy advertising a "$1.99 one-time unlock". That product does not exist in this
build. Do not paste the old file into App Store Connect.

Anything marked **⚖️ CONFIRM** needs legal sign-off.
Anything marked **🔎 VERIFY** is a factual claim you must check before submitting.

---

## App name (30 char max)

```
LandHere
```

## Subtitle (30 char max)

```
Your study-abroad checklist
```

## Promotional text (170 char max, editable without a new build)

```
Accepted your offer? LandHere turns the visa, travel and arrival maze into one clear plan, with every step linked to its official government source.
```

## Keywords (100 char max, comma-separated, no spaces)

```
study,abroad,international,student,visa,i20,f1,university,ranking,scholarship,immigration,checklist
```

🔎 VERIFY: 99 characters. Do not add terms you cannot substantiate, and do not
use competitor names — Apple rejects both.

---

## Description

⚠️ The "one-time unlock" section from the previous draft has been removed. Every
feature named below is free in this build.

```
You got your offer letter. Now what?

LandHere turns the chaos of moving abroad into a clear, step-by-step plan — built around your corridor, your timeline, and your priorities.

YOUR PLAN, NOT A GENERIC CHECKLIST
Answer a few quick questions and LandHere builds a personalised journey that starts exactly where you are — still deciding, deep in the visa process, or already landed. Every step is drawn from official government and institutional sources.

STEP-BY-STEP GUIDANCE
• After acceptance — I-20 / CAS / Study Permit, SEVIS, biometrics
• Visa process — DS-160, MRV fee, consulate interview, or the UK / Canada equivalent
• Before departure — housing, health insurance, finances, what to pack
• After arrival — SSN / SIN / NIN, bank account, phone, registering at your university

Tap a step to mark it done. Your progress saves automatically.

UNIVERSITY RANKINGS
Browse universities by LandHere score, state, or tuition — weighted for what actually matters to an international student, including out-of-state and international tuition rather than in-state net price. Our full methodology is in the app.

SCHOLARSHIPS
Direct links to official scholarship sources — no aggregators, no sign-up walls.

HONEST ABOUT WHAT IT IS
LandHere is general guidance compiled from official sources. It is not legal or immigration advice. Visa rules change — always verify with the official government website for your corridor before acting.

PRIVACY
Your account holds only your email, name, origin, destination, and your onboarding answers. No ads. No third-party analytics. We do not sell your data.

FREE
LandHere is free. There is no subscription and no in-app purchase.

CURRENTLY SUPPORTED
India → United States
India → Canada
India → United Kingdom

More corridors coming.

NEED HELP?
Profile → Support.
```

🔎 VERIFY before submitting:
- "No ads. No third-party analytics." — true today. If you ever add analytics,
  this line and the privacy nutrition label must change in the same release.
- "We do not sell your data." — ⚖️ CONFIRM the wording matches the privacy policy.
- The corridor list must match what the destination picker actually exposes.

---

## URLs

| Field | Value | Status |
|---|---|---|
| Support URL | _pending_ | ☁️ must be live HTTPS before submission |
| Marketing URL | optional | — |
| Privacy Policy URL | _pending_ | ☁️ required field; must be live HTTPS |

These must be the **same URLs** compiled into the build as
`EXPO_PUBLIC_SUPPORT_URL` and `EXPO_PUBLIC_PRIVACY_POLICY_URL`. A mismatch
between the listing and the in-app link is a review flag.

---

## App Review notes

```
LandHere is a free informational companion for international students. There is
no in-app purchase, no subscription, and no advertising. All content is available
to every registered user.

THE APP REQUIRES AN ACCOUNT. Test credentials are below. Sign-up is also open if
you prefer to create your own — only an email address and password are required,
and no email verification step will block you.

Test account:
  Email:    <REVIEWER_EMAIL>
  Password: <REVIEWER_PASSWORD>

Suggested walkthrough:
  1. Sign in with the account above.
  2. The onboarding flow builds a personalised plan (origin India, destination
     United States).
  3. "Journey" shows the visa/travel steps. Each step links out to the official
     government source it was compiled from.
  4. "Rankings" lists US universities with our scoring methodology; the
     methodology screen is linked from the header.
  5. Profile → Privacy Policy / Terms / Support open hosted web pages.
  6. Profile → Delete Account permanently deletes the account (password
     confirmation required).

CONTENT DISCLAIMER: LandHere provides general information compiled from official
government and university sources and states in-app, on the relevant screens,
that it is not legal or immigration advice. Every step carries a link to its
official source.

Currently supported corridors are India→US, India→Canada, India→UK. Other
destinations are intentionally not selectable.
```

🧑 Fill `<REVIEWER_EMAIL>` / `<REVIEWER_PASSWORD>` with a real account created
against the **production** backend. 📱 Verify the credentials work from a clean
device before submitting — a broken reviewer login is the single most common
avoidable rejection.

---

## Age rating

Answer every questionnaire category **None** — the app contains no violence,
sexual content, profanity, gambling, or user-generated content. There is no
community/chat feature in this release.

Expected outcome: **4+**.

⚖️ **CONFIRM before answering these two:**
- **Minimum age / "Made for Kids"** — the audience includes prospective students
  who may be under 18. LandHere is *not* directed at children, but your lawyer
  must confirm the position and the corresponding terms-of-service minimum age.
  Do **not** mark the app as child-directed without that advice: it changes your
  obligations under COPPA and the UK Age Appropriate Design Code.
- **Unrestricted web access** — the app opens official government sites and the
  privacy/terms/support pages in an external browser. This is a limited, curated
  set of links, not a general browser, so the "unrestricted web access" answer is
  normally **No**. ⚖️ CONFIRM.

---

## Privacy nutrition label — data inventory

Derived from `DATA_PRACTICES_FINDINGS.md` and re-checked against the code in this
pass. 🔎 VERIFY each line if you change what the app collects.

### Data collected and LINKED to the user's identity

| Data type | ASC category | Purpose | Notes |
|---|---|---|---|
| Email address | Contact Info → Email Address | App Functionality | Account identifier and login |
| Name | Contact Info → Name | App Functionality | Optional profile field |
| Origin / destination country | Usage Data → Product Interaction | App Functionality | Selects the content corridor |
| Onboarding answers | Usage Data → Product Interaction | App Functionality | Personalises the journey plan |

### Data NOT collected

- No advertising identifiers, no ad networks
- No third-party analytics or crash SDKs
- No location data
- No contacts, photos, camera, microphone, calendar, or health data
- No purchase history (there are no purchases)
- No user-generated content shared with other users

### Tracking

**Answer "No"** to "Does this app use data for tracking?" The app has no
advertising identifier access and no third-party trackers, so no App Tracking
Transparency prompt is required.

### Third parties that receive data

| Party | What reaches them | Why |
|---|---|---|
| Your backend host (Render/Railway) | Everything above, plus request IP | It runs the API and database |
| Unsplash | City/campus search terms **only**, from the server | City imagery. Called **server-side**; the user's device IP is never exposed to Unsplash |
| Official government sites | Nothing — a plain outbound link the user taps | Source verification |

🔎 VERIFY: the Unsplash call is server-side in this build (`GET /images/city`).
If image fetching ever moves back to the client, this row and the label change.

### Account deletion

Apple requires an in-app path to account deletion for any app with account
creation. LandHere has one: **Profile → Delete Account**, password-confirmed,
which permanently removes the account and all associated rows. Point to it
explicitly in the review notes if asked.
