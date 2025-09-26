export type NumberAbbreviation = 'none' | 'compact';

/** Create a currency formatter respecting the active locale. */
export const createCurrencyFormatter = (
  currency: string,
  options: Intl.NumberFormatOptions = {},
): Intl.NumberFormat =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    ...options,
  });

/** Create a general-purpose number formatter respecting locale separators. */
export const createNumberFormatter = (
  options: Intl.NumberFormatOptions = {},
): Intl.NumberFormat =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    ...options,
  });

/** Format an ISO date into a short month/day representation. */
export const formatDate = (iso: string, options?: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(new Date(iso));

/** Format a date range using the localised formatter. */
export const formatDateRange = (startIso: string, endIso: string): string => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${formatter.format(new Date(startIso))} – ${formatter.format(new Date(endIso))}`;
};

/** Round a numeric value using the specified granularity. */
export const roundValue = (value: number, granularity: 1 | 10 | 100 | 1000): number => {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value / granularity) * granularity;
  return rounded;
};

/**
 * Abbreviate large numbers using the compact notation, preserving one decimal when needed.
 */
export const abbreviateNumber = (value: number): string => {
  const formatter = new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return formatter.format(value);
};

/**
 * Apply rounding and optional abbreviation to a numeric value, returning both raw and display forms.
 */
export const formatMetricValue = (
  value: number,
  options: { rounding: 1 | 10 | 100 | 1000; abbreviate: boolean; formatter?: Intl.NumberFormat },
): { raw: number; display: string } => {
  const rounded = roundValue(value, options.rounding);
  if (options.abbreviate) {
    return { raw: rounded, display: abbreviateNumber(rounded) };
  }
  if (options.formatter) {
    return { raw: rounded, display: options.formatter.format(rounded) };
  }
  return { raw: rounded, display: rounded.toLocaleString() };
};
