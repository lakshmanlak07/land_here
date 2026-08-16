# future/

Code kept for future work but **deliberately outside `app/`** so Expo Router
cannot route to it.

Currently empty of screens.

## History: paywall.tsx

The Pro purchase screen lived here during the free-only release. It has been
moved back to `app/paywall.tsx` now that LandHere Pro ships, and the conditions
listed here for its return have been met:

1. **Server-side entitlements** — `app/core/appstore.py` verifies Apple's signed
   transaction against Apple's root CAs; `app/models/purchase.py` records it,
   unique on `original_transaction_id` so one purchase cannot entitle two
   accounts; `require_pro` in `app/core/deps.py` gates the premium routes.
   Free users cannot fetch Pro content by calling the API directly — the
   journey endpoint trims phases and the rankings endpoint trims rows before
   serialisation.
2. **`PURCHASES_ENABLED = true`** in `lib/features.ts`.
3. The screen is back at `app/paywall.tsx`.
4. **Restore verifies with the backend** rather than trusting
   `getAvailablePurchases()` — both buy and restore submit the signed
   transaction to `POST /purchases/verify`.

Note the free/Pro split settled on is narrower than the one this screen
originally sold: **scholarships, work-hour rules and the scoring methodology are
free**, because their content ships inside the bundle (so a gate there could
never be enforcement) and because gating the methodology would hide the reasoning
behind the rankings being sold.

5. **App Store Server Notifications** are handled at
   `POST /purchases/notifications`, so a refund or revocation ends access
   automatically rather than waiting for the user's next restore. The URL still
   has to be set in App Store Connect for any of it to fire.

Still outstanding, tracked rather than done:

- Nothing in the purchase flow has run against real StoreKit, and no real Apple
  notification has been received — the endpoint is tested against a synthetic
  certificate chain. Neither can change until an Apple Developer account and a
  device build exist.
