import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ImageResult {
  url: string;
  credit: string;
}

/** Default display width (px) requested when a caller doesn't specify one. */
const DEFAULT_WIDTH = 720;
/** Cap so a high-DPI full-screen hero never requests an absurdly large image. */
const MAX_WIDTH = 1080;
const STORE_PREFIX = 'imgcache:';

/**
 * What we cache and persist: the *un-sized* Unsplash base URL plus whether it's
 * resizable. The display width is applied per call in `getCityImage`, so one
 * cached entry serves both a full-bleed hero and a small thumbnail — and the
 * width never has to be part of the cache key.
 */
interface CachedImage {
  base: string;
  credit: string;
  /** true → `base` is the dynamic `raw` URL we can append &w= to. */
  resizable: boolean;
}

// In-memory layer (fastest; also remembers in-session misses so a failed query
// isn't retried on every render). `undefined` = unknown, `null` = known miss.
const memory = new Map<string, CachedImage | null>();

function toResult(c: CachedImage, width: number): ImageResult {
  const w = Math.min(Math.max(Math.round(width) || DEFAULT_WIDTH, 1), MAX_WIDTH);
  return {
    // Right-size from raw so a 264px card / 175px thumbnail doesn't decode 1080px.
    url: c.resizable ? `${c.base}&w=${w}&q=70&fm=jpg&fit=crop` : c.base,
    credit: c.credit,
  };
}

export async function getCityImage(
  query: string,
  width: number = DEFAULT_WIDTH,
): Promise<ImageResult | null> {
  const mem = memory.get(query);
  if (mem !== undefined) return mem ? toResult(mem, width) : null;

  // Persistent layer: reuse results captured on a previous launch so a cold
  // start doesn't re-fire the search API (and re-hit the demo-key rate cap).
  // Only successes are persisted, so a transient rate-limit can't poison the
  // cache forever — a miss simply retries next launch.
  try {
    const stored = await AsyncStorage.getItem(`${STORE_PREFIX}${query}`);
    if (stored) {
      const cached = JSON.parse(stored) as CachedImage;
      memory.set(query, cached);
      return toResult(cached, width);
    }
  } catch {
    // Storage read/parse failure — ignore and fall through to the network.
  }

  const key = process.env.EXPO_PUBLIC_UNSPLASH_KEY;

  if (!key) {
    // EXPO_PUBLIC_UNSPLASH_KEY missing — remember the miss (this session) and
    // fall back silently. Not persisted, so it retries once a key is set.
    memory.set(query, null);
    return null;
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`,
      { headers: { Authorization: `Client-ID ${key}` } },
    );
    if (!res.ok) { memory.set(query, null); return null; }
    const data = await res.json();
    const photo = data.results?.[0];
    if (!photo?.urls?.regular) { memory.set(query, null); return null; }
    const cached: CachedImage = {
      base: photo.urls.raw ?? photo.urls.regular,
      resizable: !!photo.urls.raw,
      // Always attribute Unsplash alongside the photographer (Unsplash credit
      // guidelines); fall back to just "Unsplash" when no name is returned.
      credit: photo.user?.name ? `${photo.user.name} · Unsplash` : 'Unsplash',
    };
    memory.set(query, cached);
    try {
      await AsyncStorage.setItem(`${STORE_PREFIX}${query}`, JSON.stringify(cached));
    } catch {
      // Persisting is best-effort; an in-memory hit still serves this session.
    }
    return toResult(cached, width);
  } catch {
    // Network/parse failure — remember the miss (this session) and fall back.
    memory.set(query, null);
    return null;
  }
}

export const COUNTRY_COLORS: Record<string, string> = {
  US: '#B22234',
  GB: '#012169',
  // The backend uses 'UK' (its one ISO deviation) — without this entry the UK
  // always fell through to the crimson fallback.
  UK: '#012169',
  CA: '#D52B1E',
  DE: '#2C2C2C',
  AU: '#003087',
  FR: '#0055A4',
  JP: '#BC002D',
  NL: '#AE1C28',
  SE: '#006AA7',
  IN: '#FF9933',
  SG: '#EF3340',
  CH: '#D52B1E',
  IE: '#169B62',
  NZ: '#003087',
  KR: '#003087',
  CN: '#DE2910',
  IT: '#009246',
  ES: '#C60B1E',
  PT: '#006600',
  AT: '#ED2939',
  BE: '#FAE042',
  DK: '#C60C30',
  FI: '#003580',
  NO: '#EF2B2D',
};

export function countryColor(code: string): string {
  // Fallback matches the brand crimson (was #534AB7, the old indigo brand colour).
  return COUNTRY_COLORS[code] ?? '#D12E3A';
}
