export interface ImageResult {
  url: string;
  credit: string;
}

const cache = new Map<string, ImageResult | null>();

export async function getCityImage(query: string): Promise<ImageResult | null> {
  if (cache.has(query)) return cache.get(query) ?? null;

  const key = process.env.EXPO_PUBLIC_UNSPLASH_KEY;
  console.log('[images] key present:', !!key, '| query:', query.substring(0, 40));

  if (!key) {
    console.warn('[images] EXPO_PUBLIC_UNSPLASH_KEY missing — restart Metro with --clear after setting it in .env');
    cache.set(query, null);
    return null;
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`,
      { headers: { Authorization: `Client-ID ${key}` } },
    );
    console.log('[images] HTTP', res.status, 'for:', query.substring(0, 40));
    if (!res.ok) { cache.set(query, null); return null; }
    const data = await res.json();
    const photo = data.results?.[0];
    if (!photo?.urls?.regular) { cache.set(query, null); return null; }
    const result: ImageResult = {
      url: photo.urls.regular,
      credit: photo.user?.name ?? 'Unsplash',
    };
    console.log('[images] loaded:', query.substring(0, 40), '| credit:', result.credit);
    cache.set(query, result);
    return result;
  } catch (e) {
    console.error('[images] error for', query, e);
    cache.set(query, null);
    return null;
  }
}

export const COUNTRY_COLORS: Record<string, string> = {
  US: '#B22234',
  GB: '#012169',
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
