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

check('production rejects non-numeric private hostnames', () => {
  // The RFC1918 octet check misses these entirely: `macbook.local` is what the
  // Expo CLI prints on macOS, and host.docker.internal is what a containerised
  // backend advertises. Both are https and neither looks private numerically.
  for (const host of [
    'https://macbook.local:8000',
    'https://host.docker.internal:8000',
    'https://api.lan',
    'https://box.home.arpa',
    'https://api.test',
  ]) {
    const errors = collectConfigErrors({ ...GOOD, API_URL: host }, { production: true });
    assert.equal(errors.length, 1, `${host} should be rejected`);
    assert.match(errors[0], /local\/private address/);
  }
});

check('production rejects an unfilled template that happens to parse', () => {
  for (const host of ['https://PASTE-THE-RENDER-URL-HERE', 'https://myserver']) {
    const errors = collectConfigErrors({ ...GOOD, API_URL: host }, { production: true });
    assert.equal(errors.length, 1, `${host} should be rejected`);
    assert.match(errors[0], /no domain/);
  }
});

check('production still accepts the real staging and production hosts', () => {
  for (const host of [
    'https://landhere-api-staging.onrender.com',
    'https://api.landhere.app',
  ]) {
    const errors = collectConfigErrors({ ...GOOD, API_URL: host }, { production: true });
    assert.deepEqual(errors, [], `${host} should be accepted`);
  }
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

check('every tab declared in the tab layout has a screen file that renders', () => {
  // The tab bar is declared in one file and the screens live in another. A
  // <Tabs.Screen name="journey"> pointing at a journey.tsx with no component
  // gives a tab you can press that shows nothing — which is exactly what
  // shipped in rc.2 and rc.3.
  const layout = readCode('app/(tabs)/_layout.tsx');
  const declared = [...layout.matchAll(/<Tabs\.Screen\s[^>]*name=["']([^"']+)["']/g)]
    .map((m) => m[1]);
  assert.ok(declared.length >= 5, `expected 5 tabs, parsed ${declared.length}`);

  const broken: string[] = [];
  for (const name of declared) {
    const rel = `app/(tabs)/${name}.tsx`;
    if (!existsSync(join(MOBILE, rel))) {
      broken.push(`${rel} (missing)`);
      continue;
    }
    if (!/export\s+default\s+function\s+\w+/.test(readCode(rel))) {
      broken.push(`${rel} (no default component)`);
    }
  }
  assert.deepEqual(broken, [], `tabs that would render nothing: ${broken.join(', ')}`);
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

check('signed-out users are redirected out of the app shell', () => {
  // The tab layout is the gate for every authenticated screen. If this effect
  // is lost, a signed-out user lands on tabs that fire authenticated requests
  // and render error states instead of the login screen.
  const tabs = readCode('app/(tabs)/_layout.tsx');
  assert.ok(tabs.includes('useAuthStore'), 'tab layout does not read auth state');
  assert.ok(/router\.replace\(\s*['"]\/\(auth\)\/login['"]\s*\)/.test(tabs),
    'tab layout does not redirect signed-out users to login');
  assert.ok(tabs.includes('hydrated'),
    'redirect must wait for hydration, or it fires before the token is read');

  const auth = readCode('app/(auth)/_layout.tsx');
  assert.ok(/router\.replace/.test(auth), 'auth layout does not redirect signed-in users onward');
});

check('purchase UI covers every state a store can return', () => {
  // A paid flow that silently does nothing on cancel, or shows "failed" for a
  // pending payment, reads as broken. Each of these is a distinct outcome the
  // stores actually produce.
  const paywall = readCode('app/paywall.tsx');
  for (const [label, needle] of [
    ['cancellation', 'ErrorCode.UserCancelled'],
    ['already-owned', 'ErrorCode.AlreadyOwned'],
    ['deferred/pending', 'ErrorCode.DeferredPayment'],
    ['network failure', 'ErrorCode.NetworkError'],
    ['item unavailable', 'ErrorCode.ItemUnavailable'],
    ['server-side pending (402)', '402'],
    ['buying spinner', 'buying'],
    ['restoring spinner', 'restoring'],
    ['error surface', 'storeError'],
    ['non-error notice surface', 'storeNotice'],
  ] as const) {
    assert.ok(paywall.includes(needle), `paywall has no ${label} handling (${needle})`);
  }
  // Cancelling must not be reported as an error.
  assert.ok(
    /case ErrorCode\.UserCancelled:[\s\S]{0,240}setStoreError\(null\)/.test(paywall),
    'cancelling a purchase is surfaced as an error',
  );
});

check('API failures are turned into readable messages, not raw errors', () => {
  // getErrorMessage maps timeouts, offline, FastAPI detail strings and 5xx into
  // something a user can act on. Screens that skip it show "[object Object]".
  const api = readCode('lib/api.ts');
  assert.ok(api.includes('export function getErrorMessage'), 'getErrorMessage missing');
  for (const rel of ['app/paywall.tsx', 'app/(tabs)/profile.tsx']) {
    assert.ok(readCode(rel).includes('getErrorMessage'), `${rel} does not map API errors`);
  }
});

check('the server-response cache is cleared on every identity change', () => {
  // The React Query cache is keyed by WHAT was requested, never by WHO
  // requested it, and it is created above the auth gate so it outlives
  // sign-out. Several cached responses differ per account because the API
  // withholds Pro content from free callers: the journey (trimmed to the free
  // phases), the rankings list (clamped to 25), university detail, and the
  // entitlement itself.
  //
  // Without a reset, a Pro user's cached journey — visa, departure and arrival
  // steps — renders for whoever signs in next on the same device with the same
  // corridor, before any refetch. That is paid content served from a
  // device-local cache to someone not entitled to it.
  const store = readCode('lib/store.ts');

  // Slice the implementation body rather than regex across the whole file: the
  // interface above also declares `logout: () => void;`, and an earlier version
  // of this check anchored on that declaration and then found setAuth's call
  // inside its window — passing while the defect was still present.
  const body = (marker: string) => {
    const start = store.indexOf(marker);
    assert.notEqual(start, -1, `${marker} not found in lib/store.ts`);
    const end = store.indexOf('\n  },', start);
    assert.notEqual(end, -1, `could not find the end of ${marker}`);
    return store.slice(start, end);
  };

  assert.ok(
    body('logout: () => {').includes('resetServerCache()'),
    'sign-out does not clear the cached server responses',
  );
  assert.ok(
    body('setAuth: (accessToken, refreshToken, user) => {').includes('resetServerCache()'),
    'sign-in does not clear the previous account cached server responses',
  );

  // The client must be shared, or the store would reset a different instance
  // from the one the app renders with.
  const qc = readCode('lib/queryClient.ts');
  assert.ok(qc.includes('export const queryClient'), 'no shared query client');
  assert.ok(qc.includes('export function resetServerCache'), 'no reset helper');
  const layout = readCode('app/_layout.tsx');
  assert.ok(layout.includes("from '../lib/queryClient'"), 'provider uses another client');
  assert.ok(
    !layout.includes('new QueryClient('),
    'the layout constructs its own client, so the store resets the wrong one',
  );
});

check('the entitlement gate is read from the shared hook, never from a local flag', () => {
  // One source of truth for "is this account Pro". A screen inventing its own
  // boolean is how a client-side bypass gets reintroduced.
  const store = readCode('lib/purchaseStore.ts');
  assert.ok(store.includes('export function useContentUnlocked'), 'gate hook missing');
  assert.ok(store.includes('/purchases/entitlements'), 'gate hook is not server-backed');

  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    // A screen assigning its own pro/unlocked boolean rather than calling the hook.
    if (/const\s+(isPro|hasPro|unlocked|purchased)\s*=\s*(true|false)\b/.test(code)) {
      offenders.push(rel);
    }
  };
  eachSource('app', visit);
  eachSource('components', visit);
  assert.deepEqual(offenders, [], 'a screen hardcodes an entitlement flag');
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
  assert.ok(
    src.includes('verifyPurchaseForPlatform'),
    'purchase path does not verify with the server',
  );
  assert.ok(src.includes('restorePurchases'), 'restore action missing');
  assert.ok(src.includes('submitToServer'), 'restore does not reach the server');
});

check('each platform has its own verification endpoint', () => {
  // An Apple JWS is not Android evidence and a Play token is not Apple
  // evidence. Two endpoints, two request shapes, and one branch that decides —
  // so nothing can be talked into treating one as the other.
  const store = readCode('lib/purchaseStore.ts');
  assert.ok(store.includes("'/purchases/verify'"), 'iOS verify endpoint missing');
  assert.ok(store.includes("'/purchases/verify/google'"), 'Android verify endpoint missing');
  assert.ok(store.includes('signed_transaction'), 'iOS request field missing');
  assert.ok(store.includes('purchase_token'), 'Android request field missing');
  assert.ok(
    /Platform\.OS === 'android'/.test(store),
    'no platform branch — one flow would be serving both stores',
  );
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
    profile.includes('verifyPurchaseForPlatform'),
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

check('the Android package and product ids are configured and distinct', () => {
  // Play's package name is the Android equivalent of the iOS bundle id, and the
  // product id is again a separate record in a separate console. Conflating them
  // makes the product silently fail to load on device.
  const appJson = JSON.parse(readFileSync(join(MOBILE, 'app.json'), 'utf8'));
  assert.equal(appJson?.expo?.android?.package, 'com.landhere.app');
  assert.notEqual(appJson?.expo?.android?.package, 'com.landhere.app.pro');
  // Same product string is used on both stores; asserted so a rename cannot
  // drift on one platform only.
  assert.ok(readCode('lib/purchaseStore.ts').includes("'com.landhere.app.pro'"));
});

check('no Google service-account credential is in the mobile source', () => {
  // The Play Developer API key is a real secret with a private key inside it.
  // It belongs on the server only. If any of these appear here, Android
  // verification has been moved into the client, which would make the whole
  // server-authoritative model decorative.
  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    if (
      /"type":\s*"service_account"|private_key_id|androidpublisher|GOOGLE_PLAY_SERVICE_ACCOUNT|GOOGLE_PUBSUB_/i.test(
        code,
      )
    ) {
      offenders.push(rel);
    }
  };
  eachSource('app', visit);
  eachSource('components', visit);
  eachSource('lib', visit);
  assert.deepEqual(offenders, []);
});

check('the store-facing wording is platform-aware', () => {
  // "Apple ID" on an Android phone reads as sloppy in a paid flow, and the
  // wording used to be duplicated per screen.
  const store = readCode('lib/purchaseStore.ts');
  assert.ok(store.includes('STORE_ACCOUNT_LABEL'), 'no platform-aware account label');
  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    // A hardcoded Apple-only ternary in a screen means the label drifted back
    // out of the shared module.
    if (/Platform\.OS === 'ios' \? 'Apple ID'/.test(code)) offenders.push(rel);
  };
  eachSource('app', visit);
  eachSource('components', visit);
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
