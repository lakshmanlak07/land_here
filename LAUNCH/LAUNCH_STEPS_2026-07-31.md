# LandHere — Launch Steps

> **HISTORICAL RECORD — do not follow as instructions.**
> This file describes a past release and is kept unedited as history. Two things
> in it are now wrong: the product model (LandHere ships free with an optional
> $1.99 one-time non-consumable, `com.landhere.app.pro` — no subscription), and
> some file paths (superseded listing and legal drafts moved to
> `LAUNCH/archive/`). Current documents: `LAUNCH/APP_STORE_METADATA.md`,
> `LAUNCH/APP_STORE_SUBMISSION_CHECKLIST.md`, `LAUNCH/ATTORNEY_REVIEW_PACKET.md`.


_Written 2026-07-31. Supersedes the timeline in `LAUNCH_RUNBOOK.md` (July 2)._

Legend: **[YOU]** = only you can do this (accounts, payment, identity, legal).
**[CLAUDE]** = I can do it in a session with you.

---

## Realistic timeline

| Stage | Elapsed |
|---|---|
| Apple Developer enrollment (individual, identity check) | 24–48 h typical; 1–4 weeks if flagged |
| Backend deploy to Render | ~1 hour |
| Build + TestFlight in your hands | same day as enrollment approval |
| App Store review, **first** submission | 2–5 days typical, 7+ in peak periods |

**Earliest realistic public launch: ~4–8 days from today**, and the long pole is
Apple, not code. Nothing you or I do compresses the identity check or the review
queue. Start enrollment first — everything else runs in parallel behind it.

---

## Step 1 — Apple Developer Program **[YOU]** · do this first, today

1. Go to <https://developer.apple.com/programs/enroll/>. Sign in with the Apple ID
   you want to own the app permanently — **this is very hard to change later**. Use
   `lakshmanlak07@gmail.com` only if that's the Apple ID you intend to keep as the
   business identity; `mobile/eas.json` already lists it.
2. Enable two-factor authentication on that Apple ID if it isn't already. Enrollment
   will not proceed without it.
3. Choose **Individual**, not Organization. Organization requires a D-U-N-S number
   and takes 2–4 weeks; Individual clears in 24–48 hours. You can convert later.
   Trade-off: your personal legal name appears as the seller on the App Store.
4. Identity verification: legal name, phone, address, plus a government photo ID
   (passport works in most regions; in India a passport is the safest choice). The
   name must match your ID **exactly** — mismatches are the single most common cause
   of multi-week stalls.
5. Pay the **$99 USD/year** fee (charged in local currency). *I can't enter payment
   details or accept Apple's agreements for you — that's yours to do.*
6. Fastest path: enroll through the **Apple Developer app on iPhone**, which uses
   on-device ID scanning and generally clears faster than the web flow.
7. Wait for the approval email. If it sits past 5 business days, contact Apple
   Developer Support directly — the forums are full of enrollments stuck for 40+ days
   that only moved after a support ticket.

**While you wait, everything below can proceed.**

---

## Step 2 — Deploy the backend to Render **[YOU + CLAUDE]** · ~1 hour

The repo is deploy-ready: `Dockerfile` runs `alembic upgrade head` then uvicorn with
proxy headers; `render.yaml` declares the web service and a managed Postgres;
migrations are a single clean chain ending at `c3d5e7f9a1b2`. I verified all of this
today.

**[YOU]** 1. Create a Render account and connect the `lakshmanlak07/land_here` GitHub
repo. Account creation and OAuth authorization are yours — I can't do those.

**[YOU]** 2. New → Blueprint → point at `render.yaml`. It provisions `landhere-api`
and the `landhere-db` Postgres together, and auto-generates `SECRET_KEY` and
`DATABASE_URL`.

**[YOU]** 3. Set the one env var marked `sync: false`:
`CORS_ALLOW_ORIGINS` = your Render URL (e.g. `https://landhere-api.onrender.com`).
Do **not** leave it as `*`. The app logs a loud warning at boot if you do.

**[CLAUDE]** 4. After first deploy I'll verify: `GET /` health check returns OK,
`GET /countries/destinations` returns the live corridors, and seed data landed.

**[YOU]** 5. Run the seed once from the Render shell: `python -m app.core.seed`.

**[CLAUDE]** 6. I'll point the app at production — set `EXPO_PUBLIC_API_URL` to the
HTTPS URL and strip the LAN/tunnel workarounds (`my_ip.txt`, `start_expo_tunnel.bat`).

> Note on Render's free Postgres tier: it expires after 90 days and **is deleted**.
> If real users are on it by then you'll lose their accounts. Move to a paid tier
> before you have users worth keeping — this is a real deadline, not a nag.

---

## Step 3 — Legal **[YOU]** · runs in parallel, blocks submission

I wrote `LAUNCH/ATTORNEY_BRIEF.md` today. Send it plus the four documents it lists to
a lawyer. It scopes the review to six decisions (minimum age, parental consent,
minors' purchases, governing law, liability, "verified" badge wording) so this should
be a cheap, fast engagement rather than a rewrite.

**To be direct: I have not cleared the legal pack and can't.** I'm not a lawyer, and
the open items are genuine judgment calls — particularly minimum age, where your
launch corridor originates in India, the DPDP Act treats under-18s as children
requiring verifiable parental consent, and your app collects no date of birth and so
cannot verify age at all. That combination is exactly the kind of thing that needs a
professional, and it may turn out to be a build change rather than a wording change.

App Store Connect requires a **publicly hosted** privacy policy URL, so nothing
submits until this is signed off. Host the approved version on GitHub Pages once it's
cleared.

---

## Step 4 — App Store Connect **[YOU]** · after enrollment approves

1. <https://appstoreconnect.apple.com> → My Apps → **+** → New App.
2. Bundle ID must match `mobile/app.json` exactly.
3. Note the **ascAppId** shown in the URL and the **appleTeamId** from your developer
   account — both are currently empty in `mobile/eas.json`. **[CLAUDE]** I'll fill
   them in once you paste them to me.
4. **IAP:** create a Non-Consumable, product ID `com.landhere.app.pro`, price tier
   $1.99. The product ID must match `mobile/lib/purchaseStore.ts` character for
   character or purchases silently fail. Attach it to the first version, or review
   will reject the build for referencing a product that doesn't exist.
5. Paste the hosted privacy policy URL from Step 3.
6. Fill the privacy nutrition label exactly per `LAUNCH/APP_STORE_LISTING.md` —
   `DATA_PRACTICES_FINDINGS.md` is the code-verified ground truth behind it.
7. **[CLAUDE]** I'll prep the listing copy, keywords, and description.

---

## Step 5 — Assets **[CLAUDE + YOU]**

- 1024×1024 icon, no alpha channel, no pre-rounded corners (Apple rejects both).
- ≥3 screenshots each at 6.9" and 6.5". Show: onboarding plan reveal, journey,
  rankings, dark mode.
- **[CLAUDE]** I can generate the frames and copy; **[YOU]** capture from a real
  device or simulator.

---

## Step 6 — Build, TestFlight, submit **[YOU runs, CLAUDE debugs]**

```bash
cd mobile
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

**Test the exact build via TestFlight on a real device before releasing.** Minimum
path: register → onboard → journey (half free) → hit paywall → **sandbox purchase** →
force-quit and reopen, verify the unlock persisted → restore purchases on a second
sandbox account. IAP bugs found after launch cost you refunds and one-star reviews;
found in TestFlight they cost you an hour.

---

## Explicitly not shipping in v1

Per your own runbook: no Android build, no corridors beyond IN→US/CA/UK, and no
"verified" badge on anything a human hasn't checked (AU/IE/NL/NZ/FR/SG work rules
stay marked unverified).

---

## Sources

- [Apple Developer Program enrollment](https://developer.apple.com/programs/enroll/)
- [Identity verification — Apple Developer Help](https://developer.apple.com/help/account/membership/identity-verification/)
- [Enrolling via the Apple Developer app](https://developer.apple.com/help/account/membership/enrolling-in-the-app/)
- [App Store review times in 2026](https://bettercodepush.com/blog/app-store-review-times-2026)
- [App Store review queue delays in 2026](https://appstorereview.app/guides/app-store-review-queue-delays-2026)
