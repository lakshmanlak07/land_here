/**
 * Small, dependency-free formatters for displaying university numbers.
 * Avoids Intl/toLocaleString, which is unreliable across RN engines.
 */

function withThousands(n: number): string {
  const rounded = Math.round(n);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "$45,120" — or a dash when the value is missing. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `$${withThousands(value)}`;
}

/** "$45.1k" — compact form for tight spaces (list rows). */
export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `$${withThousands(value)}`;
}

/**
 * "87%" — accepts either a fraction (0–1) or an already-percent value
 * (0–100), since backends differ on graduation-rate encoding.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

/** "12,430" or "1.2M" for large research-output counts. */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return withThousands(value);
}

/** Rounds the LandHere Score for display ("87"). */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Math.round(value).toString();
}

/** Weight as a percent label ("30%"), accepting fraction or percent input. */
export function formatWeight(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

/**
 * Compact initials from a university name — skips filler words, returns up to
 * 3 uppercase letters. E.g. "University of Michigan" -> "UM".
 */
export function initials(name: string): string {
  const skip = new Set(['of', 'the', 'and', 'at', 'for', 'in']);
  const words = name.split(/[\s.,&-]+/).filter((w) => w && !skip.has(w.toLowerCase()));
  const out = words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
  // Names made only of filler words (or empty) would otherwise render a blank tile.
  return out || (name.trim()[0] ?? '?').toUpperCase();
}
