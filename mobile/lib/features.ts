/**
 * Build-time feature flags.
 *
 * These are compile-time constants, not runtime settings — nothing the user or
 * the device can toggle.
 */

/**
 * In-app purchases / LandHere Pro.
 *
 * OFF for the free launch (Oct 2026). Every feature is free; the server's
 * PAYWALL_ENABLED and PURCHASES_ENABLED settings are off too, so the API never
 * withholds content and every /purchases/* route answers 404. The paywall
 * screen is parked in future/ and expo-iap is not installed, so no store SDK
 * ships in the binary.
 *
 * The old AsyncStorage `landhere_purchased` flag is gone and must never come
 * back: a device-writable boolean is not an entitlement.
 */
export const PURCHASES_ENABLED = false;
