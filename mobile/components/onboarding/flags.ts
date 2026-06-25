// Turn a 2-letter ISO-3166 country code into its emoji flag by mapping each
// ASCII letter to its Regional Indicator Symbol. No assets, no dependency — the
// platform font renders the pair as a flag. Returns a neutral globe for codes
// that aren't two A–Z letters (e.g. missing/odd data) so the UI never shows
// a blank tile.
export function flagEmoji(code: string | null | undefined): string {
  if (!code) return '🌐';
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🌐';
  const base = 0x1f1e6; // Regional Indicator Symbol Letter A
  const a = base + (cc.charCodeAt(0) - 65);
  const b = base + (cc.charCodeAt(1) - 65);
  return String.fromCodePoint(a, b);
}

// Compact initials for a university "code tile" (e.g. "Harvard University" →
// "HU", "OCAD University" → "OU"). Falls back to the first letters of the name
// when there's only one word. Capped at 4 chars to fit the 44px tile.
export function uniInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  const acronym = words
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return acronym.slice(0, 4);
}
