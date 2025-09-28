const LOCALE = 'en-AU';

export const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

export const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  maximumFractionDigits: 1,
});

export const numberFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});
