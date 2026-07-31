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

console.log('\nFree-only build: no client-side entitlement unlock path');

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

check('purchases are disabled by the feature flag', () => {
  assert.match(read('lib/features.ts'), /export const PURCHASES_ENABLED = false/);
});

check('the paywall route no longer exists under app/', () => {
  assert.equal(existsSync(join(MOBILE, 'app/paywall.tsx')), false);
  assert.equal(existsSync(join(MOBILE, 'future/paywall.tsx')), true);
});

check('no shipped screen navigates to /paywall', () => {
  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    if (code.includes('/paywall')) offenders.push(rel);
  };
  eachSource('app', visit);
  eachSource('components', visit);
  assert.deepEqual(offenders, []);
});

check('the purchase store cannot unlock from device storage', () => {
  const src = readCode('lib/purchaseStore.ts');
  assert.ok(!src.includes('AsyncStorage'), 'purchaseStore must not read AsyncStorage');
  assert.ok(!src.includes('landhere_purchased'), 'the old entitlement key must be gone');
  assert.ok(!src.includes('getAvailablePurchases'), 'client-trusted restore must be gone');
});

check('no shipped code imports react-native-iap', () => {
  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    if (code.includes('react-native-iap')) offenders.push(rel);
  };
  eachSource('app', visit);
  eachSource('components', visit);
  eachSource('lib', visit);
  assert.deepEqual(offenders, []);
});

check('no price or subscription claims in shipped screens', () => {
  const offenders: string[] = [];
  const visit = (rel: string, code: string) => {
    if (/\$1\.99|Restore Purchases|Unlock Everything/i.test(code)) offenders.push(rel);
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
