/**
 * Build-time environment gate.
 *
 *   node --experimental-strip-types lib/checkBuildEnv.ts            # production rules
 *   node --experimental-strip-types lib/checkBuildEnv.ts --dev      # development rules
 *
 * Runs as the `eas-build-pre-install` npm script, so an EAS build FAILS ON THE
 * BUILD MACHINE when the environment is wrong.
 *
 * Why this exists in addition to the runtime check in lib/config.ts: the runtime
 * check throws when the app launches, which turns a config mistake into a
 * crash-on-open — an automatic App Review rejection and a bad way to find out.
 * This catches the same mistake before a binary exists. The runtime check stays
 * as the backstop for anything that bypasses this script.
 *
 * Values are read from the real environment first (how EAS injects them), then
 * from mobile/.env (how local builds get them).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { collectConfigErrors, type UrlEnv } from './urlPolicy.ts';

const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ENV_FILE = join(HERE, '..', '.env');

/** Minimal .env reader — no dependency, and we only need KEY=value lines. */
function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const production = !process.argv.includes('--dev');
const fileEnv = readEnvFile(ENV_FILE);
const pick = (key: string) => process.env[key] ?? fileEnv[key];

const env: UrlEnv = {
  API_URL: pick('EXPO_PUBLIC_API_URL'),
  PRIVACY_POLICY_URL: pick('EXPO_PUBLIC_PRIVACY_POLICY_URL'),
  TERMS_URL: pick('EXPO_PUBLIC_TERMS_URL'),
  SUPPORT_URL: pick('EXPO_PUBLIC_SUPPORT_URL'),
};

// A credential under an EXPO_PUBLIC_ name is shipped to every device. Block the
// one we already removed, and any obvious future repeat.
const leaked = Object.keys({ ...process.env, ...fileEnv }).filter(
  (k) => /^EXPO_PUBLIC_.*(KEY|SECRET|TOKEN|PASSWORD)$/.test(k),
);

const errors = collectConfigErrors(env, { production });
for (const k of leaked) {
  errors.push(`${k} looks like a credential. EXPO_PUBLIC_* values ship inside the app bundle and are readable by anyone — move it server-side.`);
}

const mode = production ? 'production' : 'development';
if (errors.length > 0) {
  console.error(`\n✖ Environment is not valid for a ${mode} build:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\nSee mobile/.env.example.\n`);
  process.exit(1);
}

console.log(`✔ Environment valid for a ${mode} build.`);
for (const [k, v] of Object.entries(env)) {
  if (v) console.log(`    ${k} = ${v}`);
}
