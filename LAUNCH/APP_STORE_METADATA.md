# App Store Connect metadata — LandHere v1.0.0

_Prepared 2026-08-01, revised 2026-08-16 for the LandHere Pro purchase._

**The app is free to download, with one optional in-app purchase.**

| Setting in App Store Connect | Value |
|---|---|
| App price tier | **Free** |
| Bundle identifier | `com.landhere.app` |
| In-App Purchase — reference name | LandHere Pro |
| In-App Purchase — **product id** | `com.landhere.app.pro` |
| In-App Purchase — type | **Non-Consumable** |
| In-App Purchase — price | **US $1.99** (Apple's $1.99 tier; other storefronts convert) |
| Subscriptions | **None.** Do not create one. |
| Family Sharing on the IAP | **Off** |

⚠️ The bundle id and the product id are **different identifiers** and are entered
in different places. `com.landhere.app` is the app. `com.landhere.app.pro` is the
thing sold inside it. Getting these the same way round matters — the purchase
silently fails to load if the product id does not match the app exactly.

⚠️ **Answer "Yes" to the in-app purchase question.** The build contains purchase
code and a paywall. An earlier revision of this file said to answer "No"; that was
correct for the free-only build and is wrong now.

Superseded listing files have been moved to `LAUNCH/archive/` — do not paste
anything from there into App Store Connect.

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

⚠️ The free/Pro split below must match what the server actually enforces. Apple
rejects listings that describe a purchase inaccurately, and a description that
sells a free feature as paid is the easiest version of that mistake to make —
the rc.1 copy did exactly that with scholarships and work rules.

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

FREE, WITH AN OPTIONAL ONE-TIME UPGRADE
LandHere is free to download and free to use. Free includes your first two journey phases, the top 25 ranked universities, the full scholarship directory, the full student work-hour rules, the scoring methodology, country guides and the money tools.

LandHere Pro is a single one-time purchase of $1.99 that adds the rest of your journey — visa process, before departure, after arrival — plus every ranked university beyond the top 25 and their detail pages. It is a one-time payment. There is no subscription and no recurring charge. Restore Purchases is available in Settings.

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
LandHere is an informational companion for international students. The app is
free to download and free to use. There is ONE optional non-consumable in-app
purchase, "LandHere Pro" (com.landhere.app.pro), US $1.99. There is NO
subscription and NO advertising.

WHAT IS FREE: account and onboarding; the first two journey phases; the top 25
ranked universities; the complete scholarship directory; the complete student
work-hour rules; the scoring methodology; country guides; arrival necessities;
currency and cost tools.

WHAT LANDHERE PRO ADDS: the remaining journey phases (visa process, before
departure, after arrival); ranked universities beyond the top 25; university
detail pages.

The entitlement is enforced on our server, so the locked content is not present
on the device until the purchase is verified. A "Restore Purchases" action is
available on the Pro screen AND in Settings, without starting a purchase.

THE APP REQUIRES AN ACCOUNT. Test credentials are below. Sign-up is also open if
you prefer to create your own — only an email address and password are required,
and no email verification step will block you.

Test account (already has LandHere Pro, so the full content is reviewable):
  Email:    <REVIEWER_EMAIL_PRO>
  Password: <REVIEWER_PASSWORD_PRO>

Second test account (free tier, so the paywall and the locked state are
reviewable):
  Email:    <REVIEWER_EMAIL_FREE>
  Password: <REVIEWER_PASSWORD_FREE>

Suggested walkthrough:
  1. Sign in with the FREE account above.
  2. The onboarding flow builds a personalised plan (origin India, destination
     United States).
  3. "Journey" shows the visa/travel steps. Each step links out to the official
     government source it was compiled from. At the end of the free phases, the
     upgrade screen appears.
  4. "Rankings" lists the top 25 with our scoring methodology; the methodology
     screen is linked from the header and is free.
  5. Scholarships and Work hours are fully available without purchasing.
  6. Profile → LandHere Pro → Restore Purchases exercises the restore path.
  7. Sign in with the PRO account to review the unlocked journey, the full
     rankings list, and university detail pages.
  8. Profile → Privacy Policy / Terms / Support open hosted web pages.
  9. Profile → Delete Account permanently deletes the account (password
     confirmation required).

CONTENT DISCLAIMER: LandHere provides general information compiled from official
government and university sources and states in-app, on the relevant screens,
that it is not legal or immigration advice. Every step carries a link to its
official source.

Currently supported corridors are India→US, India→Canada, India→UK. Other
destinations are intentionally not selectable.
```

🧑 Fill both credential pairs with real accounts created against the
**production** backend. 📱 Verify they work from a clean device before
submitting — a broken reviewer login is the single most common avoidable
rejection.

🧑 The Pro reviewer account needs a genuine entitlement. Buy Pro with a **sandbox
Apple ID** on that account, or insert the verified purchase row directly. A
reviewer who cannot see the paid content is the second most common avoidable
rejection for apps with an IAP.

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
| Purchase record | **Purchases → Purchase History** | App Functionality | Apple's transaction identifiers for LandHere Pro, stored against the account so the server can serve entitled content. **No payment method, card number, or billing detail is received or stored.** |

⚠️ The Purchase History row is **new**. An earlier revision of this file declared
no purchase history because the build had no purchases. Declaring "not collected"
while the server stores a purchase record would be an inaccurate nutrition label.

### Data NOT collected

- No advertising identifiers, no ad networks
- No third-party analytics or crash SDKs
- No location data
- No contacts, photos, camera, microphone, calendar, or health data
- No payment method, card number, billing address, or payer name — Apple
  processes the payment and shares none of that with us
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
| Apple | The purchase itself, plus a certificate-revocation check from our server during verification. **No LandHere account data.** | Processing the purchase and letting us confirm the receipt is genuine |
| Official government sites | Nothing — a plain outbound link the user taps | Source verification |

🔎 VERIFY: the Unsplash call is server-side in this build (`GET /images/city`).
If image fetching ever moves back to the client, this row and the label change.

### Account deletion

Apple requires an in-app path to account deletion for any app with account
creation. LandHere has one: **Profile → Delete Account**, password-confirmed,
which permanently removes the account and all associated rows — sessions and the
LandHere Pro purchase record included. Point to it explicitly in the review notes
if asked.

⚖️ CONFIRM: deleting the account removes our purchase record, but the Apple
purchase itself survives and can be restored. Because one purchase maps to one
LandHere account, restoring onto a newly created account needs manual help today.
The lawyer should confirm the Terms describe this adequately — see §4.7 of
`LAUNCH/ATTORNEY_REVIEW_PACKET.md`.
