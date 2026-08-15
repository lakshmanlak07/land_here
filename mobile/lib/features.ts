/**
 * Build-time feature flags.
 *
 * These are compile-time constants, not runtime settings — nothing the user or
 * the device can toggle.
 */

/**
 * In-app purchases / LandHere Pro.
 *
 * ON. The two conditions that had to be met first are met:
 *   1. The server verifies Apple's signed transaction (app/core/appstore.py)
 *      and records it in the `purchases` table; entitlement is read from that
 *      table and nowhere else.
 *   2. Premium content is withheld by the API itself — `require_pro` on
 *      university detail, and phase/row trimming on journey and rankings — so
 *      the client gate is presentation, not protection.
 *
 * The old AsyncStorage `landhere_purchased` flag is gone and must never come
 * back: a device-writable boolean is not an entitlement.
 */
export const PURCHASES_ENABLED = true;
