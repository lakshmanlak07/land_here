/**
 * Runnable checks for the production URL policy and the free-only build.
 *
 *   node --experimental-strip-types lib/urlPolicy.check.ts
 *
 * Deliberately dependency-free (node:assert only) — the project has no test
 * runner installed, and adding one is blocked by an unrelated peer-dependency
 * conflict. These assertions still fail loudly and exit non-zero.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { collectConfigErrors, isPrivateHost, validateUrl } from './urlPolicy.ts';

const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MOBILE = join(HERE, '..');

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`FAIL  ${name}\n      ${(e as Error).message.split('\n')[0]}`);
  }
}

console.log('\nProduction URL validation');

check('accepts a real HTTPS URL', () => {
  assert.equal(validateUrl('X', 'https://api.landhere.app', { requireHttps: true }), null);
});

check('rejects a missing value', () => {
  assert.match(validateUrl('X', undefined, { requireHttps: true })!, /not set/);
  assert.match(validateUrl('X', '   ', { requireHttps: true })!, /not set/);
});

check('rejects plain HTTP in production', () => {
  assert.match(validateUrl('X', 'http://api.landhere.app', { requireHttps: true })!, /https/);
});

check('rejects localhost in production', () => {
  assert.match(validateUrl('X', 'https://localhost:8000', { requireHttps: true })!, /local\/private/);
});

check('rejects LAN addresses in production', () => {
  for (const host of ['192.168.0.113', '10.0.0.5', '172.16.4.4', '169.254.1.1']) {
    const err = validateUrl('X', `https://${host}`, { requireHttps: true });
    assert.ok(err, `${host} should be rejected`);
    assert.match(err!, /local\/private/);
  }
});

check('allows public addresses that merely look similar', () => {
  // 172.32.x is outside the private 172.16–31 range; 11.x is public.
  assert.equal(validateUrl('X', 'https://172.32.0.1', { requireHttps: true }), null);
  assert.equal(validateUrl('X', 'https://11.0.0.1', { requireHttps: true }), null);
  assert.equal(isPrivateHost('172.32.0.1'), false);
  assert.equal(isPrivateHost('172.16.0.1'), true);
});

check('rejects placeholders', () => {
  for (const v of [
    'https://example.com/privacy',
    'https://your-domain.com/terms',
    'https://landhere.app/TODO',
    'https://placeholder.app',
  ]) {
    assert.ok(validateUrl('X', v, { requireHttps: true }), `${v} should be rejected`);
  }
});

check('rejects a malformed URL', () => {
  assert.match(validateUrl('X', 'not a url', { requireHttps: true })!, /not a valid URL/);
});

console.log('\nEnvironment collection');

const GOOD = {
  API_URL: 'https://api.landhere.app',
  PRIVACY_POLICY_URL: 'https://landhere.app/privacy',
  TERMS_URL: 'https://landhere.app/terms',
  SUPPORT_URL: 'https://landhere.app/support',
};

check('a complete production environment passes', () => {
  assert.deepEqual(collectConfigErrors(GOOD, { production: true }), []);
});

check('production requires every legal URL', () => {
  for (const key of ['PRIVACY_POLICY_URL', 'TERMS_URL', 'SUPPORT_URL'] as const) {
    const env = { ...GOOD, [key]: undefined };
    const errors = collectConfigErrors(env, { production: true });
    assert.equal(errors.length, 1, `${key} missing should produce exactly one error`);
  }
});

check('production rejects the LAN URL that shipped in rc.1', () => {
  const errors = collectConfigErrors(
    { ...GOOD, API_URL: 'http://192.168.0.113:8000' },
    { production: true },
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /EXPO_PUBLIC_API_URL/);
});

check('development needs only the API URL, and allows LAN HTTP', () => {
  const errors = collectConfigErrors(
    { API_URL: 'http://192.168.0.113:8000' },
    { production: false },
  );
  assert.deepEqual(errors, []);
});

check('development still rejects a missing API URL', () => {
  assert.equal(collectConfigErrors({}, { production: false }).length, 1);
});

console.log('\nExpo Router: every route renders a component');

const read = (p: string) => readFileSync(join(MOBILE, p), 'utf8');

/** Source with comments removed — these checks are about code, not prose. */
const readCode = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/** Walk .ts/.tsx under `dir`, skipping this check file itself. */
function eachSource(dir: string, visit: (rel: string, code: string) => void) {
  for (const entry of readdirSync(join(MOBILE, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) eachSource(rel, visit);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.check.ts')) {
      visit(rel, readCode(rel));
    }
  }
}

/**
 * Every .tsx under app/ is a route or a layout, and Expo Router renders it via
 * its DEFAULT export. A file without one is a blank screen.
 *
 * This check exists because exactly that shipped. The rc.2 "free-only" commit
 * (dc75096) stripped content gating screen by screen and, for three files,
 * deleted the component along with the gate: journey, scholarships and
 * work-hours were left as imports + constants + StyleSheet, with no default
 * export, for both rc.2 and rc.3.
 *
 * Nothing caught it. Those files are still valid TypeScript, so `tsc` passed;
 * ESLint passed; the policy suite passed; both bundles scanned clean; both
 * exports succeeded. A missing default export only shows up at runtime, and no
 * build had ever run on a device. Hence a static check.
 */
const ROUTES_THAT_MUST_RENDER = [
  'app/(tabs)/journey.tsx',
  'app/scholarships.tsx',
  'app/work-hours.tsx',
];

check('every Expo Router route file has a default export', () => {
  const missing: string[] = [];
  eachSource('app', (rel, code) => {
    if (!/\.tsx$/.test(rel)) return;
    // `export default function X`, `export default X`, `export default (`, …
    if (!/export\s+default\b/.test(code)) missing.push(rel);
  });
  assert.deepEqual(
    missing,
    [],
    `route files with no default export (Expo Router renders nothing): ${missing.join(', ')}`,
  );
});

check('the three routes lost in rc.2 render again', () => {
  // Named explicitly as well as covered by the sweep above: these are the
  // regression, and naming them makes a re-break say so directly.
  for (const rel of ROUTES_THAT_MUST_RENDER) {
    assert.equal(existsSync(join(MOBILE, rel)), true, `${rel} is missing`);
    const code = readCode(rel);
    assert.ok(
      /export\s+default\s+function\s+\w+/.test(code),
      `${rel} has no default component export`,
    );
    // A component, not just a stub that satisfies the regex.
    assert.ok(code.includes('return ('), `${rel} default export renders nothing`);
  }
});

check('the free screens carry no purchase gate', () => {
  // Scholarships and work-hour rules are free for everyone. Their content is
  // bundled in constants/, so a gate here would be cosmetic anyway — and would
  // contradict the paywall copy, which promises they stay free.
  for (const rel of ['app/scholarships.tsx', 'app/work-hours.tsx']) {
    const code = readCode(rel);
    assert.ok(!code.includes('/paywall'), `${rel} must not route to the paywall`);
    assert.ok(!code.includes('useContentUnlocked'), `${rel} must not gate on entitlement`);
  }
});

check('the journey gate is driven by the server response', () => {
  // Not by a local step count. The old build fetched every step and hid half of
  // them with `Math.ceil(totalSteps / 2)`, so the "locked" content was in the
  // payload the whole time. The server now sends only what the account may see.
  const code = readCode('app/(tabs)/journey.tsx');
  assert.ok(code.includes('locked_phases'), 'journey must read locked_phases from the API');
  assert.ok(code.includes('pro_required'), 'journey must read pro_required from the API');
  assert.ok(code.includes('/paywall'), 'journey must offer the upgrade path');
  assert.ok(
    !/freeStepCount|totalSteps\s*\/\s*2/.test(code),
    'journey must not re-introduce client-side step slicing',
  );
});

// ── LandHere Pro ──────────────────────────────────────────────────────────────
// These checks used to assert that no purchase existed. The product now HAS a
// one-time purchase, so they assert the opposite thing — that the purchase is
// wired up the safe way. The risk moved; it did not go away. What matters now
// is that the device cannot grant itself Pro and that no Apple credential is in
// the bundle.

check('purchases are enabled by the feature flag', () => {
  assert.match(read('lib/features.ts'), /export const PURCHASES_ENABLED = true/);
});

check('the paywall route exists under app/ and future/ no longer shadows it', () => {
  assert.equal(existsSync(join(MOBILE, 'app/paywall.tsx')), true);
  assert.equal(
    existsSync(join(MOBILE, 'future/paywall.tsx')),
    false,
    'the old paywall copy must be gone so only one screen can drift',
  );
});

check('a locked surface can reach the paywall', () => {
  const referrers: string[] = [];
  const visit = (rel: string, code: string) => {
    if (rel !== 'app/paywall.tsx' && code.includes('/paywall')) referrers.push(rel);
  };
  eachSource('app', visit);
  eachSource('components', visit);
  assert.ok(referrers.length > 0, 'nothing navigates to /paywall — the gate is unreachable');
});

check('entitlement is never read from device storage', () => {
  // The core invariant. A device-writable flag is not an entitlement: the
  // previous release shipped `landhere_purchased` in AsyncStorage, which any
  // user could set. Entitlement must come from the server, every time.
  const src = readCode('lib/purchaseStore.ts');
  assert.ok(!src.includes('AsyncStorage'), 'purchaseStore must not touch AsyncStorage');
  assert.ok(!src.includes('SecureStore'), 'purchaseStore must not persist entitlement');
  assert.ok(!src.includes('landhere_purchased'), 'the old entitlement key must stay gone');
});

check('entitlement comes from the server endpoints', () => {
  const src = readCode('lib/purchaseStore.ts');
  assert.ok(src.includes('/purchases/entitlements'), 'entitlement lookup missing');
  assert.ok(src.includes('/purchases/verify'), 'server verification call missing');
});

check('both buying and restoring go through server verification', () => {
  // Restore must not be a second, weaker path to Pro. Every transaction —
  // fresh or restored — is submitted to the same verify endpoint.
  const src = readCode('app/paywall.tsx');
  assert.ok(src.includes('verifySignedTransaction'), 'purchase path does not verify');
  assert.ok(src.includes('restorePurchases'), 'restore action missing');
  assert.ok(src.includes('submitToServer'), 'restore does not reach the server');
});

check('a visible Restore Purchases action is present', () => {
  // Apple requires a restore mechanism for non-consumables, and it must be
  // reachable without starting a purchase — hence Settings as well as the
  // paywall. A user who reinstalls should never have to look at a buy button
  // to get back what they already paid for.
  assert.ok(readCode('app/paywall.tsx').includes('Restore Purchases'), 'missing on the paywall');
  const profile = readCode('app/(tabs)/profile.tsx');
  assert.ok(profile.includes('Restore Purchases'), 'missing in Settings');
  assert.ok(
    profile.includes('verifySignedTransaction'),
    'Settings restore must verify with the server, not unlock locally',
  );
});

check('expo-iap is a dependency and a registered config plugin', () => {
  // Both halves matter. Without the dependency there is no StoreKit; without
  // the config-plugin entry the native capability is never generated, and the
  // purchase silently fails on device — which an Expo export cannot reveal.
  const pkg = JSON.parse(readFileSync(join(MOBILE, 'package.json'), 'utf8'));
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  assert.ok('expo-iap' in deps, 'expo-iap must be a dependency');

  const appJson = JSON.parse(readFileSync(join(MOBILE, 'app.json'), 'utf8'));
  const plugins: unknown[] = appJson?.expo?.plugins ?? [];
  const names = plugins.map((p) => (Array.isArray(p) ? p[0] : p));
  assert.ok(names.includes('expo-iap'), 'expo-iap must be in app.json plugins');
});

check('react-native-iap is not used alongside expo-iap', () => {
  // Two StoreKit modules in one app is a native-linking conflict waiting to
  // happen. expo-iap is the Expo-module choice; the other must stay out.
  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    if (code.includes('react-native-iap')) offenders.push(rel);
  };
  eachSource('app', visit);
  eachSource('components', visit);
  eachSource('lib', visit);
  assert.deepEqual(offenders, []);

  const pkg = JSON.parse(readFileSync(join(MOBILE, 'package.json'), 'utf8'));
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  assert.ok(!('react-native-iap' in deps), 'react-native-iap must not be a dependency');
});

check('no Apple credential or private key is in the mobile source', () => {
  // Verification is done server-side against Apple's PUBLIC root CAs. Nothing
  // secret should ever be needed here — if one of these appears, someone has
  // moved verification into the client.
  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    if (/BEGIN PRIVATE KEY|\.p8\b|APPLE_ROOT_CA|issuerId|SharedSecret|APPLE_.*_KEY/i.test(code)) {
      offenders.push(rel);
    }
  };
  eachSource('app', visit);
  eachSource('components', visit);
  eachSource('lib', visit);
  assert.deepEqual(offenders, []);
});

check('the product id is distinct from the bundle id', () => {
  // com.landhere.app is the app; com.landhere.app.pro is the thing sold inside
  // it. They are configured in different places in App Store Connect and
  // conflating them is a common, silent setup failure.
  const src = readCode('lib/purchaseStore.ts');
  assert.ok(src.includes("'com.landhere.app.pro'"), 'product id missing');

  const appJson = JSON.parse(readFileSync(join(MOBILE, 'app.json'), 'utf8'));
  assert.equal(appJson?.expo?.ios?.bundleIdentifier, 'com.landhere.app');
  assert.notEqual(appJson?.expo?.ios?.bundleIdentifier, 'com.landhere.app.pro');
});

check('no subscription or recurring-billing claims in shipped screens', () => {
  // A one-time non-consumable must never be described as a subscription: that
  // is both a false claim and an App Review rejection.
  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    if (/per month|\/month|per year|\/year|auto-renew|recurring charge[^s]|subscribe now/i.test(code)) {
      offenders.push(rel);
    }
  };
  eachSource('app', visit);
  eachSource('components', visit);
  assert.deepEqual(offenders, []);
});

check('no EXPO_PUBLIC_UNSPLASH_KEY anywhere in mobile source', () => {
  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    if (code.includes('EXPO_PUBLIC_UNSPLASH_KEY')) offenders.push(rel);
  };
  eachSource('app', visit);
  eachSource('components', visit);
  eachSource('lib', visit);
  assert.deepEqual(offenders, []);
});

console.log('\nSettings screen: legal links and account deletion');

check('Settings links Privacy, Terms, and Support', () => {
  const src = read('app/(tabs)/profile.tsx');
  assert.ok(src.includes('PRIVACY_POLICY_URL'), 'privacy link missing');
  assert.ok(src.includes('TERMS_URL'), 'terms link missing');
  assert.ok(src.includes('SUPPORT_URL'), 'support link missing');
  assert.ok(src.includes('Privacy Policy'), 'privacy label missing');
  assert.ok(src.includes('Terms of Service'), 'terms label missing');
});

check('account deletion is still reachable and calls DELETE /account', () => {
  const src = read('app/(tabs)/profile.tsx');
  assert.ok(src.includes('Delete account'), 'delete entry point missing');
  assert.ok(src.includes("api.delete('/account'"), 'delete request missing');
  assert.ok(src.includes('openDeleteConfirm'), 'confirmation step missing');
});

console.log(
  failures === 0
    ? '\nAll checks passed.\n'
    : `\n${failures} check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
