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

console.log('Refresh classification');

await check('network error is transient (credentials kept)', async () => {
  const r = await requestRefresh(async () => { throw new TypeError('Network request failed'); }, 'https://x', 't');
  assert.equal(r.kind, 'transient');
});

for (const status of [500, 502, 503, 429, 408]) {
  await check(`HTTP ${status} is transient`, async () => {
    const r = await requestRefresh(async () => respond(status), 'https://x', 't');
    assert.equal(r.kind, 'transient');
  });
}

for (const status of [400, 401, 403]) {
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
