/**
 * Currency data for the converter.
 *
 * CURRENCIES is the set supported by the Frankfurter API (ECB reference rates,
 * https://api.frankfurter.dev). COUNTRY_CURRENCY maps country codes to their
 * currency so the converter can default sensibly (destination currency → home
 * currency).
 */

export interface Currency {
  code: string;
  name: string;
}

/** Currencies the Frankfurter API can convert between. */
export const CURRENCIES: Currency[] = [
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'ILS', name: 'Israeli Shekel' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'ISK', name: 'Icelandic Króna' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'PLN', name: 'Polish Złoty' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'ZAR', name: 'South African Rand' },
];

/** Quick lookup of whether a code is convertible by Frankfurter. */
const SUPPORTED = new Set(CURRENCIES.map((c) => c.code));

/** Country code → its currency code, for the corridor's destinations & origins. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', UK: 'GBP', IN: 'INR', CA: 'CAD', AU: 'AUD',
  DE: 'EUR', FR: 'EUR', NL: 'EUR', IE: 'EUR', IT: 'EUR',
  JP: 'JPY', NZ: 'NZD', SG: 'SGD', KR: 'KRW', CN: 'CNY', AE: 'AED',
};

/**
 * Resolves a usable Frankfurter currency code from either a currency code or a
 * country code, falling back to `fallback` when we can't (or it isn't
 * supported by Frankfurter, e.g. AED).
 */
export function resolveCurrency(
  value: string | null | undefined,
  fallback: string,
): string {
  if (value) {
    const upper = value.toUpperCase();
    if (SUPPORTED.has(upper)) return upper;
    const fromCountry = COUNTRY_CURRENCY[upper];
    if (fromCountry && SUPPORTED.has(fromCountry)) return fromCountry;
  }
  return fallback;
}
