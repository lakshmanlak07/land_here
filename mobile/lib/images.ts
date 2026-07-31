import api from './api';

export interface ImageResult {
  url: string;
  credit: string;
}

const cache = new Map<string, ImageResult | null>();

/**
 * Look up a city/place photo via the backend (`GET /images/city`), which holds
 * the Unsplash key server-side — no credential ships in this bundle. Returns
 * null (colored-block fallback) when signed out, offline, or no photo exists.
 */
export async function getCityImage(query: string): Promise<ImageResult | null> {
  if (cache.has(query)) return cache.get(query) ?? null;

  try {
    const res = await api.get<ImageResult | null>('/images/city', {
      params: { query },
    });
    const result = res.data?.url ? res.data : null;
    cache.set(query, result);
    return result;
  } catch (e) {
    console.warn('[images] lookup failed for', query.substring(0, 40));
    // Don't cache failures caused by transient auth/network state — retry on
    // next mount. Only "no photo" (success path above) is cached as null.
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
