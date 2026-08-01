> # ⚠️ SUPERSEDED — DO NOT USE FOR SUBMISSION
>
> This file is **rc.1-era copy for a paid app**. It advertises a
> "FREE TO START · ONE-TIME UNLOCK / One payment of $1.99", and that product does
> not exist in this build: LandHere ships free, with no in-app purchase.
> Pasting this into App Store Connect would describe a purchase the app does not
> contain, which is a likely rejection.
>
> **Use `LAUNCH/APP_STORE_METADATA.md` instead.**
> Kept only as a record of the earlier positioning.

# App Store Listing — LandHere
_Draft for review. You do the Apple enrollment + upload + submit._

---

## App Name (30 chars max)
```
LandHere
```

## Subtitle (30 chars max)
```
Your international student plan
```

---

## Description (4000 chars max — paste into App Store Connect)

```
You got your offer letter. Now what?

LandHere turns the chaos of moving abroad into a clear, step-by-step plan — built around your corridor, your timeline, and your priorities.

──────────────────────────
YOUR PLAN, NOT A GENERIC CHECKLIST
──────────────────────────
Answer 11 quick questions and LandHere builds a personalised journey that starts exactly where you are — still deciding, deep in the visa process, or already landed. Every step is drawn from official government and institutional sources, not guesswork.

──────────────────────────
STEP-BY-STEP GUIDANCE
──────────────────────────
LandHere walks you through every phase:

• After acceptance — I-20 / CAS / Study Permit, SEVIS, biometrics
• Visa process — DS-160, MRV fee, consulate interview, or UK/Canada equivalent
• Before departure — housing, health insurance, finances, what to pack
• After arrival — SSN / SIN / NIN, bank account, phone, registering at your university

Tap a step to mark it done. Your progress saves automatically and picks up where you left off.

──────────────────────────
UNIVERSITY RANKINGS
──────────────────────────
Browse universities by LandHere score, state, or tuition — filtered to what actually matters for international students. Tap any university to see details.

──────────────────────────
SCHOLARSHIPS
──────────────────────────
Direct links to verified, official scholarship sources — no aggregators, no sign-up walls. We only point you to the real thing.

──────────────────────────
HONEST ABOUT WHAT IT IS
──────────────────────────
LandHere is general guidance compiled from official sources. It is not legal or immigration advice. Visa rules change — always verify with the official government website for your corridor before acting.

──────────────────────────
PRIVACY FIRST
──────────────────────────
Your account holds only your email, name, origin, destination, and your onboarding answers. Journey progress stays on your device. No ads. No analytics. No selling your data.

──────────────────────────
FREE TO START · ONE-TIME UNLOCK
──────────────────────────
The first half of your journey and a preview of the top-ranked universities are free. One payment of $1.99 unlocks everything — full journey, 500+ rankings, scholarships, work rules, and money tools. No subscription. No recurring charges. Ever.

──────────────────────────
CURRENTLY SUPPORTED CORRIDORS
──────────────────────────
India → United States  
India → Canada  
India → United Kingdom  

More corridors coming soon.

──────────────────────────
NEED HELP?
──────────────────────────
Tap Profile → Contact / Support to reach us directly.
```

_(Character count: ~1,850 — well under the 4,000 limit. You can expand with more corridor detail once you launch more.)_

---

## Keywords (100 chars max, comma-separated — no spaces after commas)
```
student visa,study abroad,F1 visa,UK student,international student,move abroad,study in USA
```
_(92 chars — fits. Swap out lower-traffic terms after checking App Store Connect's keyword suggestions.)_

**Backup / longer keyword list to pick from (choose 100 chars worth):**
- student visa, study abroad, F1 visa, study permit, UK student visa
- international student, move abroad, study in USA, study in UK, study in Canada
- visa checklist, student plan, study in America, Indian student
- university rankings, scholarship finder, expat student

---

## App Store Category
**Primary:** Education  
**Secondary:** Productivity _(optional — helps if users search "planner")_

---

## Age Rating — Apple Questionnaire Answers

Answer these **exactly** in App Store Connect under "Age Rating":

| Question | Answer |
|---|---|
| Cartoon or fantasy violence | None |
| Realistic violence | None |
| Sexual content or nudity | None |
| Profanity or crude humour | None |
| Alcohol, tobacco, or drug use or references | None |
| Mature/suggestive themes | None |
| Horror/fear themes | None |
| Medical/treatment information | None |
| Gambling and contests | None |
| User-generated content | **No** _(community is not live)_ |
| Unrestricted web access | **No** |

**Expected rating: 4+** — the most permissive tier. Apple will confirm during review.

---

## Privacy Nutrition Label (App Store Connect → App Privacy)

You'll need to declare what data you collect. Based on the app:

| Data type | Collected? | Used for |
|---|---|---|
| Name | Yes | Account, displayed in app |
| Email address | Yes | Account login, support |
| User ID | Yes | Linking progress to account |
| Coarse location | No | — |
| Precise location | No | — |
| Photos/camera | No | — |
| Contacts | No | — |
| Search history | No | — |
| Purchase history | No | — _(the $1.99 unlock is processed by Apple; the app stores only an on-device unlock flag)_ |
| Financial info | No | — |
| Health & fitness | No | — |
| Browsing history | No | — |
| Crash data | No (in-app only, not sent to analytics) | — |
| Performance data | No | — |
| Other diagnostic data | No | — |

**Linked to identity:** Name, Email, User ID → yes (linked to account)  
**Used for tracking:** No  
**Data not sold to third parties:** Yes

---

## Support URL
```
https://landhere.app/support
```
_(If you don't have a web page yet, a mailto: link like `mailto:lakshmanlak07@gmail.com` is accepted during initial submission — update it once the site is live.)_

---

## Marketing URL _(optional)_
```
https://landhere.app
```

---

## Copyright
```
© 2026 LandHere. All rights reserved.
```

---

## Version Release Notes (for v1.0 — shown on update screen)
```
Welcome to LandHere! Your personalised international student companion — step-by-step guidance from offer letter to settled, for India → US, Canada, and UK.
```

---

## What to do before submitting

1. **Apple Developer Program** — enroll at developer.apple.com ($99/yr). Takes 24–48 hrs.
2. **App icon** — 1024×1024 px PNG, no alpha channel, no rounded corners (Apple adds them).
3. **Screenshots** — minimum 3 per device size. Required: 6.5" iPhone (1284×2778 px), 5.5" iPhone (1242×2208 px). Optional but recommended: iPad Pro 12.9" and 6.7" iPhone 15 Pro Max.
4. **Preview video** — optional but boosts conversion. 15–30 s, no UIKit elements outside the app.
5. **Build** — run `eas build --platform ios --profile production`, upload the `.ipa` to App Store Connect via Transporter or EAS Submit.
6. **TestFlight** — submit to TestFlight first (`eas submit --platform ios`), test on real devices, then promote to App Store.

---

## Human-only gates before submission

- [ ] Lawyer reviews Privacy Policy + Terms of Service before publishing
- [ ] Confirm `SECRET_KEY` in production `.env` is a strong random value (not the dev placeholder)
- [ ] Verify the support email (`lakshmanlak07@gmail.com`) is actively monitored — Apple requires a working support channel
- [ ] App Privacy section in App Store Connect filled out accurately (use table above)
