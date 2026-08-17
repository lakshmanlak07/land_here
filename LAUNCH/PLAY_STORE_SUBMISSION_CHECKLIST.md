# LandHere — Google Play submission checklist

_Written 2026-08-17 for `feat/pro-iap`. The Apple counterpart is
`LAUNCH/APP_STORE_SUBMISSION_CHECKLIST.md`._

**Nothing in this file has been done.** No Google account exists, no Play
Console record exists, and no Android build has ever run on a device. This is
the ordered list of what you will need to do.

**LandHere ships free to download, with ONE optional in-app purchase.**
LandHere Pro · Android package `com.landhere.app` · product id
`com.landhere.app.pro` · **one-time, non-consumable** · US $1.99 ·
**no subscription**.

Legend: 🧑 needs your account or a decision · 💳 costs money · ☁️ needs the
deployed backend · 📱 needs a real Android device · 🔐 is a secret

---

## A. What the code already does

- ✅ Server-side verification against `purchases.productsv2.getproductpurchasev2`
- ✅ Separate Apple and Google verification paths that reject each other's evidence
- ✅ One entitlement model — a purchase on either store entitles the LandHere account
- ✅ Replay prevention: `UNIQUE (platform, platform_transaction_id)`
- ✅ Refund/revocation handling — a `CANCELLED` purchase revokes Pro
- ✅ Deferred/pending payments do not entitle (402, shown as a notice not an error)
- ✅ Fail-closed with no credentials: 503, never a grant
- ✅ Notification endpoint authenticated with **Pub/Sub push OIDC** — issuer,
  signature, expiry, audience and service account all verified
- ✅ Purchases acknowledged server-side **after** verification and account
  linking — never for forged, wrong-product, revoked, pending or
  cross-account tokens, and never twice
- ✅ 160+ backend tests including forged, replayed, revoked, wrong-product,
  cross-account, wrong-audience, expired-token and platform-isolation cases

**Not done, and not doable without your account:** a real purchase, a real
refund, a real RTDN delivery, and any Android device run.

---

## B. Account and product setup

- [ ] 🧑 💳 **Create a Google Play Developer account** — **US $25, one-time**
      (Apple's is $99/year; Google's is a single payment). Identity verification
      can take several days, and for an individual account Google may ask for
      government ID.
- [ ] 🧑 **Create the app** in Play Console with package name **`com.landhere.app`**.
      ⚠️ The package name is **permanent** and must match `app.json` →
      `expo.android.package` exactly. It cannot be changed after the first upload.
- [ ] 🧑 **Complete the payments profile** (Play Console → Setup → Payments
      profile), including tax and banking details. ⚠️ In-app products do **not
      load** until this is active — this blocks internal testing, not just
      revenue.
- [ ] 🧑 **Create the in-app product**: Monetize → Products → In-app products.
      Product ID **`com.landhere.app.pro`**, type **one-time (non-consumable)**,
      price **US $1.99**, status **Active**.
      ⚠️ The product ID is **permanent**. It is *not* the package name.
- [ ] 🧑 Do **not** create a subscription.
- [ ] 🧑 Leave **multi-quantity purchases off** — one entitlement per account.

## C. Backend credentials (the part with real secrets)

- [ ] 🧑 **Create a Google Cloud project** and a **service account** in it.
- [ ] 🧑 Link the Cloud project to Play Console (Setup → API access) and grant
      the service account **two** permissions:

      | Permission | Needed for |
      |---|---|
      | View financial data, orders and cancellation survey responses | `purchases.productsv2.getproductpurchasev2` — reading a purchase |
      | Manage orders and subscriptions | `purchases.products.acknowledge` — confirming delivery |

      The second is easy to miss because verification works without it. The
      symptom is subtle and expensive: purchases verify and grant Pro
      correctly, then **Google auto-refunds every one of them after three
      days** because acknowledgement kept failing. Our server logs a warning
      when acknowledgement fails but deliberately still grants access, so this
      will not surface as a user-visible error — check the logs after the first
      sandbox purchase.

      🔎 Confirm the exact permission names in the current Play Console UI;
      Google renames them periodically and this file cannot track that.

      A 403 on either call is reported by our server as 503 (our
      misconfiguration), never as a bad purchase — so a permissions mistake
      cannot look like a customer's fault.
- [ ] 🔐 🧑 **Download the service-account JSON key.** This contains a **private
      key**. Set it as `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` in the hosting
      dashboard, as one line. **Never** commit it, never put it in `render.yaml`,
      never let it near the mobile bundle. The bundle scan and policy suite both
      fail if any marker of it appears in the app.
- [ ] ☁️ Configure **Pub/Sub push OIDC** for the notification endpoint — see
      section D. Neither value is a secret. Until both are set, the endpoint
      refuses every request, deliberately: Google's notification bodies are
      unsigned and that endpoint spends Google API quota.
- [ ] ☁️ Set `GOOGLE_PLAY_PACKAGE_NAME` and `GOOGLE_PLAY_PRO_PRODUCT_ID`
      (not secrets; already defaulted in `render.yaml`).
- [ ] ☁️ Set `GOOGLE_ACCEPT_TEST_PURCHASES=true` **only while testing**, and back
      to `false` before the public release. Leaving it on gives every license
      tester Pro for free.

## D. Real-time developer notifications (refunds)

- [ ] 🧑 Create a **Pub/Sub topic** in the Cloud project and grant
      `google-play-developer-notifications@system.gserviceaccount.com` the
      **Pub/Sub Publisher** role on it.
- [ ] 🧑 Play Console → Monetize → Monetization setup → set the **topic name**
      and **opt into one-time product notifications**. One-time-product RTDNs are
      only published if you opt in.
- [ ] 🧑 Create a **service account for the push subscription** (it can be the
      same one used for the Play API, or a separate, more limited one). Grant it
      the **Service Account Token Creator** role so Pub/Sub can mint identity
      tokens as it, and note its email.
- [ ] ☁️ Create a **push subscription** to
      `https://YOUR-API-ORIGIN/purchases/notifications/google` with
      **authentication enabled**: choose that service account and set the
      **audience** to the same full URL.
- [ ] ☁️ Set `GOOGLE_PUBSUB_AUDIENCE` to that exact audience string and
      `GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL` to that service account's email.
      They must match character for character — a mismatch means every
      notification is rejected with 401 and refunds stop being processed.
- [ ] ☁️ Grant `service-<PROJECT_NUMBER>@gcp-sa-pubsub.iam.gserviceaccount.com`
      the **Service Account Token Creator** role on the push service account,
      or Pub/Sub cannot sign the token at all.

**What the server checks on every notification**, per Google's push
authentication documentation: the token's signature and expiry (via
`google-auth`), that `iss` is `accounts.google.com`, that `aud` equals the
configured audience, that `email` is the configured service account, and that
`email_verified` is true. Only then is the purchase token re-checked with
Google. A request that fails any of these never reaches the Play API.
- [ ] Until this section is complete, a refunded Android user keeps Pro until
      their next restore. Not a submission blocker; a revenue and support one.

## E. Build and signing

- [ ] 🧑 Fill `mobile/eas.json` → `submit.production.android.serviceAccountKeyPath`
      (currently `REPLACE_WHEN_ANDROID_SHIPS`). 🔐 The file it points at is a
      secret; keep it out of the repo.
- [ ] 🧑 Enrol in **Play App Signing** (default for new apps). Record the upload
      key; losing it means you cannot ship updates.
- [ ] 📱 `eas build --profile production --platform android` produces an **AAB**
      (Play requires App Bundles, not APKs).
- [ ] ⚠️ **`expo-iap` cannot run in Expo Go.** Android purchase testing needs a
      development build or an internal-testing track release.
- [ ] Confirm the **target API level** meets Play's current requirement — Google
      raises the floor annually and rejects uploads below it. Check the current
      value in Play Console before building; this file cannot stay accurate on
      that.

## F. Store listing and declarations

- [ ] 🧑 Store listing: title, short description, full description. Reuse the copy
      in `LAUNCH/APP_STORE_METADATA.md`, adjusting Apple-specific wording.
- [ ] 🧑 **Graphics**: app icon 512×512 PNG · feature graphic **1024×500** (Play
      requires this and Apple has no equivalent) · at least 2 phone screenshots.
- [ ] 🧑 **Data safety form** — Play's counterpart to Apple's privacy labels, and
      a separate submission with its own wording. It must match
      `LAUNCH/PRIVACY_POLICY.md`, including the purchase record and the retained
      notification log.
- [ ] 🧑 **Content rating questionnaire** (IARC).
- [ ] 🧑 **Target audience and content** — declare the app is **not** directed at
      children. ⚖️ This interacts with the unresolved minimum-age question; see
      `LAUNCH/ATTORNEY_REVIEW_PACKET.md` §4.1–4.4. Do not answer it before the
      legal review.
- [ ] 🧑 Privacy policy URL — the same hosted URL as iOS.
- [ ] 🧑 **Ads declaration**: no ads.
- [ ] 🧑 **Government apps / financial features**: no.

## G. Device test cases 📱

None of these has been run. Each needs a real Android device and a license tester
account.

- [ ] Cold launch, no crash from config validation
- [ ] Register, sign out, sign back in
- [ ] Free tier: journey phases 1–2 only; top 25 rankings; paywall appears
- [ ] Scholarships, Work hours, Methodology all free
- [ ] **Buy Pro** — Play sheet opens, price shows as $1.99 in the local storefront
- [ ] After purchase: full journey, full rankings, university detail pages open
- [ ] **Cancel** the Play sheet mid-purchase — no error message, nothing granted
- [ ] **Deferred payment** (a test instrument that stays pending) — shown as a
      notice, no entitlement, no repeated retries
- [ ] **Already owned** — buy again on the same Google account, confirm the app
      offers a restore rather than a dead end
- [ ] **Restore Purchases** from Settings on a fresh install
- [ ] **Cross-account claim** — restore on a second LandHere account, expect a
      clear "already linked" message
- [ ] **Refund** via Play Console, then confirm Pro access ends
- [ ] Airplane mode during purchase and during verification
- [ ] Dark mode across every screen
- [ ] TalkBack over the paywall and the restore action
- [ ] Delete account, confirm re-login fails and the purchase record is gone

---

## H. Cross-store realities worth knowing before you write support replies

- **A purchase does not move between stores.** Apple and Google each only know
  about their own. Someone who bought on iOS and switches to Android cannot
  restore it on Play — but if they sign into the same LandHere account, they keep
  Pro, because entitlement lives on the account. Only *restore* is
  store-specific.
- **One purchase, one LandHere account**, enforced by a database constraint. A
  second account presenting the same purchase gets a 409.
- **Deleting a LandHere account deletes the purchase record.** The store purchase
  survives; re-attaching it to a new account currently needs manual help.
- **Google's three-day acknowledgement rule cuts in our favour.** If our server
  cannot verify a purchase, the client never acknowledges it, and Google
  auto-refunds the user within three days.
