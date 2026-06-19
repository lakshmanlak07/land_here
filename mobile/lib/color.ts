/**
 * Compose an `rgba()` string from a `#rrggbb` hex colour + alpha.
 *
 * The theme's accent tokens are all solid hex, so this lets presentational
 * primitives (tinted icon chips, pills, scrims) derive a translucent fill from
 * whatever accent they're handed — without adding a new token per colour.
 * Returns the input unchanged if it isn't a 6-digit hex.
 */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
