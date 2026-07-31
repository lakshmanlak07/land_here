/**
 * config.ts
 *
 * Single place that reads and validates the build-time environment.
 *
 * EXPO_PUBLIC_* values are inlined into the JS bundle at build time, so a
 * mistake here ships to users and can only be fixed with a new binary. That is
 * why production validation throws rather than warns: a build that would point
 * at a laptop's LAN address, or link to a placeholder privacy policy, must fail
 * on the build machine — not in App Review, and not on a user's phone.
 *
 * Development stays permissive on purpose: http://192.168.x.x:8000 is the
 * normal, correct setup for a physical device on your own network.
 */
import Constants from 'expo-constants';

import { collectConfigErrors } from './urlPolicy';

export { validateUrl, collectConfigErrors } from './urlPolicy';

/**
 * True for a real release build (`eas build --profile production`, or any
 * non-dev bundle). __DEV__ is false in release bundles; the Expo Go / dev-client
 * case keeps the relaxed rules.
 */
export const IS_PRODUCTION_BUILD = !__DEV__;

const env = {
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  PRIVACY_POLICY_URL: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL,
  SUPPORT_URL: process.env.EXPO_PUBLIC_SUPPORT_URL,
};

const errors = collectConfigErrors(env, { production: IS_PRODUCTION_BUILD });

if (errors.length > 0) {
  const message =
    `Invalid app configuration:\n  - ${errors.join('\n  - ')}\n\n` +
    `Set these in mobile/.env (development) or as EAS build environment\n` +
    `variables (production). See mobile/.env.example.`;
  if (IS_PRODUCTION_BUILD) {
    // Hard failure. A release build with a broken backend URL or a placeholder
    // privacy link is not something to degrade gracefully around.
    throw new Error(message);
  }
  console.error(`[config] ${message}`);
}

export const API_URL = env.API_URL;
export const PRIVACY_POLICY_URL = env.PRIVACY_POLICY_URL;
export const TERMS_URL = env.TERMS_URL;
export const SUPPORT_URL = env.SUPPORT_URL;

/** Shown in Settings so a bug report can name the exact build. */
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
