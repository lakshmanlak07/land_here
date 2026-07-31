/**
 * Build-time feature flags.
 *
 * These are compile-time constants, not runtime settings — nothing the user or
 * the device can toggle.
 */

/**
 * In-app purchases / Pro tier.
 *
 * OFF for the free-only v1 launch. The entitlement was enforced only by an
 * AsyncStorage boolean on the device, which is not an entitlement at all: any
 * user could set it. Rather than ship a paid tier anyone can unlock, v1 gives
 * every user the full content set and hides all purchase surfaces.
 *
 * Turning this back on is NOT just flipping this flag. It requires:
 *   1. Server-side receipt validation (StoreKit 2 signed transactions),
 *      a verified-purchase table, and a `require_pro` dependency on the
 *      premium API routes.
 *   2. Moving future/paywall.tsx back into app/ so the route exists again.
 * The client-side store below must never again be the sole gate.
 */
export const PURCHASES_ENABLED = false;
