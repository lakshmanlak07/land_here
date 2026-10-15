/**
 * Regression checks for account isolation and network-tolerant sessions.
 *
 *   node --experimental-strip-types lib/session.check.ts     (part of `npm run check`)
 *
 * Exercises the real logic in lib/progressCore.ts and lib/sessionPolicy.ts with
 * an in-memory storage and a fake fetch — no React Native runtime needed.
 */
import assert from 'node:assert/strict';

import {
  createProgressStore,
  LEGACY_PROGRESS_KEY,
  pendingStorageKey,
  progressStorageKey,
  type KeyValueStorage,
  type ProgressRemote,
} from './progressCore.ts';
import { requestRefresh } from './sessionPolicy.ts';

let failures = 0;
async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${name}\n        ${(e as Error).message}`);
  }
}

function memoryStorage(seed: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    async getItem(k) { return data.has(k) ? data.get(k)! : null; },
    async setItem(k, v) { data.set(k, v); },
    async removeItem(k) { data.delete(k); },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

type FakeResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
const respond = (status: number, body: unknown = {}): FakeResponse => ({
  ok: status >= 200 && status < 300, status, json: async () => body,
});

console.log('Progress isolation');

await check('account B never sees account A progress (same device)', async () => {
  const storage = memoryStorage();
  const store = createProgressStore(storage);
  await store.getState().setUser('user-a');
  store.getState().toggle('step-1');
  store.getState().toggle('step-2');
  await flush();
  // Automatic sign-out path: the user id simply becomes null.
  await store.getState().setUser(null);
  assert.deepEqual(store.getState().completedIds, {});
  await store.getState().setUser('user-b');
  assert.deepEqual(store.getState().completedIds, {}, 'B inherited A progress');
  assert.equal(store.getState().completedCount(['step-1', 'step-2']), 0);
});

await check('switching directly A -> B (no sign-out in between) also isolates', async () => {
  const store = createProgressStore(memoryStorage());
  await store.getState().setUser('user-a');
  store.getState().toggle('s');
  await flush();
  await store.getState().setUser('user-b');
  assert.equal(store.getState().isCompleted('s'), false);
});

await check('A gets their own progress back after signing in again', async () => {
  const storage = memoryStorage();
  const store = createProgressStore(storage);
  await store.getState().setUser('user-a');
  store.getState().toggle('s1');
  await flush();
  await store.getState().setUser(null);
  await store.getState().setUser('user-a');
  assert.deepEqual(store.getState().completedIds, { s1: true });
  assert.ok(storage.data.has(progressStorageKey('user-a')));
});

await check('signed out: ticks are not persisted anywhere', async () => {
  const storage = memoryStorage();
  const store = createProgressStore(storage);
  await store.getState().setUser(null);
  store.getState().toggle('s1');
  await flush();
  assert.equal(storage.data.size, 0);
});

await check('the legacy device-wide key is dropped, never adopted', async () => {
  const storage = memoryStorage({ [LEGACY_PROGRESS_KEY]: JSON.stringify({ old: true }) });
  const store = createProgressStore(storage);
  await store.getState().setUser('user-b');
  assert.deepEqual(store.getState().completedIds, {});
  assert.equal(storage.data.has(LEGACY_PROGRESS_KEY), false);
});

await check('account deletion forgets that account progress', async () => {
  const storage = memoryStorage();
  const store = createProgressStore(storage);
  await store.getState().setUser('user-a');
  store.getState().toggle('s1');
  await flush();
  await store.getState().forget('user-a');
  assert.equal(storage.data.has(progressStorageKey('user-a')), false);
  assert.deepEqual(store.getState().completedIds, {});
});

await check('a slow load for a previous user cannot overwrite the current user', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => { release = r; });
  const base = memoryStorage({ [progressStorageKey('user-a')]: JSON.stringify({ a: true }) });
  const storage: KeyValueStorage = {
    ...base,
    async getItem(k) { if (k.endsWith('user-a')) await gate; return base.getItem(k); },
  };
  const store = createProgressStore(storage);
  const pending = store.getState().setUser('user-a');
  await flush();
  await store.getState().setUser('user-b');
  release();
  await pending;
  assert.equal(store.getState().userId, 'user-b');
  assert.deepEqual(store.getState().completedIds, {});
});

console.log('Server sync (offline-first)');

/** Fake server: per-user completed sets; `online` toggles failures. */
function fakeServer() {
  const db = new Map<string, Set<string>>();
  let online = true;
  const calls: string[] = [];
  const remoteFor = (user: string): ProgressRemote => ({
    async fetch() {
      calls.push('fetch');
      if (!online) throw new Error('offline');
      return [...(db.get(user) ?? new Set())];
    },
    async push(changes) {
      calls.push('push');
      if (!online) throw new Error('offline');
      const set = db.get(user) ?? new Set<string>();
      for (const c of changes) {
        if (c.completed) set.add(c.step_id);
        else set.delete(c.step_id);
      }
      db.set(user, set);
      return [...set];
    },
  });
  return { db, calls, remoteFor, setOnline: (v: boolean) => { online = v; } };
}

await check('a tick made online reaches the server', async () => {
  const srv = fakeServer();
  const store = createProgressStore(memoryStorage(), srv.remoteFor('u1'));
  await store.getState().setUser('u1');
  store.getState().toggle('s1');
  await store.getState().flush();
  assert.deepEqual([...srv.db.get('u1')!], ['s1']);
  assert.deepEqual(store.getState().pending, {});
});

await check('offline ticks are kept, survive a restart, and sync on reconnect', async () => {
  const srv = fakeServer();
  const storage = memoryStorage();
  const s1 = createProgressStore(storage, srv.remoteFor('u1'));
  await s1.getState().setUser('u1');
  srv.setOnline(false);
  s1.getState().toggle('a');
  s1.getState().toggle('b');
  await s1.getState().flush();
  assert.deepEqual(s1.getState().completedIds, { a: true, b: true }, 'local ticks lost while offline');
  assert.ok(storage.data.has(pendingStorageKey('u1')), 'pending queue not persisted');
  // App restart while still offline: a new store instance over the same storage.
  const s2 = createProgressStore(storage, srv.remoteFor('u1'));
  await s2.getState().setUser('u1');
  assert.deepEqual(s2.getState().completedIds, { a: true, b: true });
  srv.setOnline(true);
  await s2.getState().flush();
  assert.deepEqual([...srv.db.get('u1')!].sort(), ['a', 'b']);
  assert.deepEqual(s2.getState().pending, {});
});

await check('server progress appears on a fresh device (reinstall)', async () => {
  const srv = fakeServer();
  srv.db.set('u1', new Set(['x', 'y']));
  const store = createProgressStore(memoryStorage(), srv.remoteFor('u1'));
  await store.getState().setUser('u1');
  assert.deepEqual(store.getState().completedIds, { x: true, y: true });
});

await check('a pending offline un-tick is not overwritten by older server state', async () => {
  const srv = fakeServer();
  srv.db.set('u1', new Set(['x']));
  const storage = memoryStorage();
  const store = createProgressStore(storage, srv.remoteFor('u1'));
  await store.getState().setUser('u1');
  srv.setOnline(false);
  store.getState().toggle('x'); // un-tick offline
  await store.getState().flush();
  assert.equal(store.getState().isCompleted('x'), false);
  srv.setOnline(true);
  await store.getState().setUser(null);
  await store.getState().setUser('u1'); // re-login pulls; pending must win
  assert.equal(store.getState().isCompleted('x'), false);
  assert.equal(srv.db.get('u1')!.has('x'), false, 'server not updated');
});

await check('existing device ticks are uploaded on the first sync', async () => {
  const srv = fakeServer();
  const storage = memoryStorage({ [progressStorageKey('u1')]: JSON.stringify({ old1: true }) });
  const store = createProgressStore(storage, srv.remoteFor('u1'));
  await store.getState().setUser('u1');
  assert.deepEqual([...srv.db.get('u1')!], ['old1']);
});

await check('sync never mixes accounts on one device', async () => {
  const srv = fakeServer();
  const storage = memoryStorage();
  let current = 'a';
  const remote: ProgressRemote = {
    fetch: () => srv.remoteFor(current).fetch(),
    push: (c) => srv.remoteFor(current).push(c),
  };
  const store = createProgressStore(storage, remote);
  await store.getState().setUser('a');
  store.getState().toggle('s');
  await store.getState().flush();
  current = 'b';
  await store.getState().setUser('b');
  assert.deepEqual(store.getState().completedIds, {});
  assert.equal(srv.db.get('b')?.size ?? 0, 0);
});

await check('a tick made while the first pull is in flight is still sent', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => { release = r; });
  const pushed: string[][] = [];
  const server = new Set<string>();
  const remote: ProgressRemote = {
    async fetch() { await gate; return [...server]; },
    async push(changes) {
      pushed.push(changes.map((c) => c.step_id));
      for (const c of changes) {
        if (c.completed) server.add(c.step_id);
        else server.delete(c.step_id);
      }
      return [...server];
    },
  };
  const store = createProgressStore(memoryStorage({ ['journey_synced:u1']: '1' }), remote);
  const binding = store.getState().setUser('u1');
  await flush();
  assert.equal(store.getState().hydrated, true, 'local load should finish before the pull');
  store.getState().toggle('late'); // during the in-flight initial pull
  release();
  await binding;
  await store.getState().flush();
  assert.deepEqual(pushed.flat(), ['late'], 'tick made mid-pull was never sent');
  assert.equal(store.getState().isCompleted('late'), true);
  assert.deepEqual(store.getState().pending, {});
});

await check('queues larger than one batch are sent in chunks of 200', async () => {
  const sizes: number[] = [];
  const remote: ProgressRemote = {
    async fetch() { return []; },
    async push(changes) { sizes.push(changes.length); return []; },
  };
  const many: Record<string, true> = {};
  for (let i = 0; i < 450; i++) many[`s${i}`] = true;
  const store = createProgressStore(
    memoryStorage({ [progressStorageKey('u1')]: JSON.stringify(many) }),
    remote,
  );
  await store.getState().setUser('u1');
  assert.deepEqual(sizes, [200, 200, 50]);
  assert.deepEqual(store.getState().pending, {});
});

await check('taps before the account has loaded are ignored', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => { release = r; });
  const base = memoryStorage({ [progressStorageKey('u1')]: JSON.stringify({ a: true, b: true }) });
  const storage: KeyValueStorage = { ...base, async getItem(k) { await gate; return base.getItem(k); } };
  const store = createProgressStore(storage);
  const binding = store.getState().setUser('u1');
  store.getState().toggle('c');
  release();
  await binding;
  assert.deepEqual(store.getState().completedIds, { a: true, b: true });
  assert.deepEqual(JSON.parse(base.data.get(progressStorageKey('u1'))!), { a: true, b: true });
});

console.log('Refresh classification');

await check('network error is transient (credentials kept)', async () => {
  const r = await requestRefresh(async () => { throw new TypeError('Network request failed'); }, 'https://x', 't');
  assert.equal(r.kind, 'transient');
});

for (const status of [500, 502, 503, 429, 408, 400, 403]) {
  await check(`HTTP ${status} is transient`, async () => {
    const r = await requestRefresh(async () => respond(status), 'https://x', 't');
    assert.equal(r.kind, 'transient');
  });
}

for (const status of [401]) {
  await check(`HTTP ${status} is a definitive rejection (sign out)`, async () => {
    const r = await requestRefresh(async () => respond(status), 'https://x', 't');
    assert.equal(r.kind, 'invalid');
  });
}

await check('200 with a token pair succeeds', async () => {
  const r = await requestRefresh(
    async () => respond(200, { access_token: 'a', refresh_token: 'r', token_type: 'bearer' }),
    'https://x', 't',
  );
  assert.deepEqual(r, { kind: 'ok', pair: { access_token: 'a', refresh_token: 'r' } });
});

await check('200 without a usable pair is transient, not a sign-out', async () => {
  const r = await requestRefresh(async () => respond(200, { nope: 1 }), 'https://x', 't');
  assert.equal(r.kind, 'transient');
});

await check('posts the refresh token to /auth/refresh', async () => {
  let seen: { url: string; body: string } | null = null;
  await requestRefresh(async (url, init) => { seen = { url, body: init.body }; return respond(401); }, 'https://api', 'tok');
  assert.equal(seen!.url, 'https://api/auth/refresh');
  assert.deepEqual(JSON.parse(seen!.body), { refresh_token: 'tok' });
});

console.log('Wiring');

const { readFileSync } = await import('node:fs');
const { fileURLToPath } = await import('node:url');
const src = (p: string) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url).href), 'utf8');

await check('api.ts signs out only on a definitive refresh rejection', () => {
  const api = src('lib/api.ts');
  assert.match(api, /requestRefresh\(/);
  assert.match(api, /if \(result\.kind === 'invalid'\) logout\(\);/);
});

await check('hydrate keeps the session when the server is unreachable', () => {
  const store = src('lib/store.ts');
  assert.match(store, /if \(me === null\) \{\s*await settleOffline/);
  assert.match(store, /result\.kind === 'transient'\) \{\s*await settleOffline/);
});

await check('password-answer 401s never refresh or sign out', () => {
  const api = src('lib/api.ts');
  assert.match(api, /login\|register\|refresh\|password/);
  // Only the wrong-password answer from /account is exempt; an expired token on DELETE /account refreshes.
  assert.match(api, /url\.startsWith\('\/account'\) && detail === WRONG_PASSWORD/);
  assert.match(src('../app/routes/account.py'), /detail="Incorrect password\."/);
  assert.match(api, /WRONG_PASSWORD = 'Incorrect password\.'/);
  assert.ok(!/cfg\._retry[^}]*logout\(\)/.test(api), 'retry branch must not sign out');
});

await check('a refresh that lands after the account changed is ignored', () => {
  const api = src('lib/api.ts');
  assert.match(api, /if \(useAuthStore\.getState\(\)\.refreshToken !== refreshToken\) return null;/);
  const i = api.indexOf('refreshToken !== refreshToken');
  assert.ok(i > 0 && i < api.indexOf("result.kind === 'ok'"), 'the account check must run before tokens are applied');
});

await check('sign-out clears abandoned onboarding answers; failed answer save stays on screen', () => {
  assert.match(src('lib/store.ts'), /removeItem\('onboarding_answers'\)/);
  const ob = src('app/(auth)/onboarding.tsx');
  // A failed save after sign-up returns to the plan screen (whose button runs finish()), never the account form.
  assert.match(ob, /setAccountOpen\(false\);\s*setError\(getErrorMessage\(e, "Your account is ready/);
  // finish() clears the device buffer once the answers are on the account.
  assert.match(ob, /removeItem\(ANSWERS_BUFFER_KEY\)\.catch\(\(\) => \{\}\); \/\/ saved on the account now\s*completeOnboarding/);
});

await check('a malformed id or a permanently refused batch never blocks sync', async () => {
  const storage = memoryStorage();
  const good = '11111111-1111-4111-8111-111111111111';
  let pushes = 0;
  let refuse = true;
  const remote: ProgressRemote = {
    async fetch() { return []; },
    async push(changes) {
      pushes++;
      if (refuse) { refuse = false; throw Object.assign(new Error('422'), { response: { status: 422 } }); }
      return changes.filter((c) => c.completed).map((c) => c.step_id);
    },
  };
  const store = createProgressStore(storage, remote);
  await store.getState().setUser('u1');
  store.getState().toggle('not-a-uuid');
  store.getState().toggle(good);
  await store.getState().flush();
  assert.deepEqual(store.getState().pending, {}, 'a batch the server refuses (here: one malformed id) leaves the queue');
  assert.equal(store.getState().completedIds[good], true, 'local tick is kept');
  store.getState().toggle('22222222-2222-4222-8222-222222222222');
  await store.getState().flush();
  assert.deepEqual(store.getState().pending, {}, 'later changes sync');
  assert.ok(pushes >= 2);
});

await check('root layout re-binds progress to the signed-in user id', () => {
  const layout = src('app/_layout.tsx');
  assert.match(layout, /setUser\(userId\)/);
  assert.match(layout, /s\.user\?\.id/);
});

await check('no screen reads or writes the legacy shared progress key', () => {
  for (const p of ['app/(tabs)/profile.tsx', 'app/(tabs)/journey.tsx', 'app/(tabs)/index.tsx']) {
    assert.ok(!src(p).includes("'journey_completed_ids'"), `${p} touches the legacy key`);
  }
});

if (failures) {
  console.log(`\n${failures} session check(s) FAILED.`);
  process.exit(1);
}
console.log('\nAll session checks passed.');
