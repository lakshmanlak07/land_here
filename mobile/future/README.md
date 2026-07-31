# future/

Code kept for future work but **deliberately outside `app/`** so Expo Router
cannot route to it.

## paywall.tsx

The Pro purchase screen. Removed from `app/` for the free-only v1 launch: while
it lived at `app/paywall.tsx` it was a reachable route (including via the
`landhere://paywall` deep link), and it called `setPurchased(true)` straight
after a client-side purchase with no server verification.

To bring the paid tier back, all of the following are required — moving the file
alone is not enough:

1. Server-side entitlements: StoreKit 2 signed-transaction verification, a
   verified-purchase table (unique on the Apple original transaction id so one
   purchase can't be claimed by two accounts), and a `require_pro` dependency on
   the premium API routes. Free users must not be able to fetch premium content
   by calling the API directly.
2. `PURCHASES_ENABLED = true` in `lib/features.ts`.
3. Move this file back to `app/paywall.tsx`.
4. Rewrite restore to verify with the backend rather than trusting
   `getAvailablePurchases()`.
5. App Store Server Notifications for refunds and revocations.

The screen still imports `react-native-iap`; it is not compiled into the app
while it sits here, since nothing in `app/` imports it.
