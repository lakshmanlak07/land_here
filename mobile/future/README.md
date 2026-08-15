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

Still outstanding, tracked rather than done:

- **App Store Server Notifications** for refunds and revocations. Today a refund
  is only noticed if Apple reports a `revocationDate` on a transaction we
  re-verify, which happens on restore rather than immediately.
- Nothing in the purchase flow has run against real StoreKit. It cannot, until
  an Apple Developer account and a device build exist.
