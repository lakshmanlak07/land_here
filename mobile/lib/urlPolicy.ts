/**
 * urlPolicy.ts
 *
 * Pure validation rules for the build-time URL configuration. Deliberately has
 * ZERO imports so it can be exercised directly by the check script
 * (lib/urlPolicy.check.ts) without pulling in Expo or React Native.
 *
 * lib/config.ts applies these rules to the real environment.
 */

/** Hosts that mean "this build only works on the developer's machine". */
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];

/** Substrings that mean the value was never filled in. */
const PLACEHOLDER_MARKERS = [
  'example.com',
  'your-',
  'yourdomain',
  'changeme',
  'change-me',
  'todo',
  'tbd',
  'placeholder',
  '<',
];

export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (LOCAL_HOSTNAMES.includes(h)) return true;
  // RFC1918 / link-local: 10.x, 192.168.x, 172.16–31.x, 169.254.x
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  const m = /^172\.(\d+)\./.exec(h);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

/**
 * Validate one required URL. Returns an error string, or null when acceptable.
 * `requireHttps` is what separates a production build from a dev one.
 */
export function validateUrl(
  name: string,
  value: string | undefined,
  { requireHttps }: { requireHttps: boolean },
): string | null {
  if (!value || !value.trim()) return `${name} is not set.`;
  const raw = value.trim();

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return `${name} is not a valid URL: "${raw}"`;
  }

  const lower = raw.toLowerCase();
  const marker = PLACEHOLDER_MARKERS.find((p) => lower.includes(p));
  if (marker) {
    return `${name} still contains a placeholder ("${marker}"): "${raw}"`;
  }

  if (requireHttps) {
    if (url.protocol !== 'https:') {
      return `${name} must use https:// in a production build (got "${url.protocol}//"). Plain HTTP is also blocked by App Transport Security.`;
    }
    if (isPrivateHost(url.hostname)) {
      return `${name} points at a local/private address ("${url.hostname}"), which is unreachable for real users.`;
    }
  } else if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `${name} must be an http(s) URL (got "${url.protocol}//").`;
  }

  return null;
}

export interface UrlEnv {
  API_URL?: string;
  PRIVACY_POLICY_URL?: string;
  TERMS_URL?: string;
  SUPPORT_URL?: string;
}

/** Every problem with a given environment, as human-readable lines. */
export function collectConfigErrors(
  values: UrlEnv,
  { production }: { production: boolean },
): string[] {
  const checks: [string, string | undefined][] = [
    ['EXPO_PUBLIC_API_URL', values.API_URL],
    ['EXPO_PUBLIC_PRIVACY_POLICY_URL', values.PRIVACY_POLICY_URL],
    ['EXPO_PUBLIC_TERMS_URL', values.TERMS_URL],
    ['EXPO_PUBLIC_SUPPORT_URL', values.SUPPORT_URL],
  ];

  return checks
    .map(([name, value]) => {
      // In development only the API URL is required — you can't work without a
      // backend, but nobody needs a hosted privacy policy to run the app locally.
      if (!production && name !== 'EXPO_PUBLIC_API_URL') return null;
      return validateUrl(name, value, { requireHttps: production });
    })
    .filter((e): e is string => e !== null);
}
