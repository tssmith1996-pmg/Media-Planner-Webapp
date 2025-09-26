import { Tactic, TacticChannel } from './schemas';

export type MetricEstimates = {
  impressions: number;
  clicks: number;
  conversions: number;
};

/** Channel click-through benchmarks used when CPC data is unavailable. */
export const CHANNEL_CTR_DEFAULTS: Record<TacticChannel, number> = {
  Search: 0.04,
  Social: 0.011,
  Display: 0.0035,
  Video: 0.0025,
  Audio: 0.0005,
  DOOH: 0.0002,
  Affiliate: 0.03,
  'Retail Media': 0.02,
  Other: 0.01,
};

/** Channel conversion-rate benchmarks used when CPA data is unavailable. */
export const CHANNEL_CVR_DEFAULTS: Record<TacticChannel, number> = {
  Search: 0.05,
  Social: 0.025,
  Display: 0.01,
  Video: 0.008,
  Audio: 0.003,
  DOOH: 0.001,
  Affiliate: 0.06,
  'Retail Media': 0.04,
  Other: 0.02,
};

/** Estimate impressions from a CPM input. */
export function estimateImpressionsFromCPM(budget: number, cpm: number): number {
  if (cpm <= 0) return 0;
  return (budget / cpm) * 1000;
}

/** Estimate clicks from a CPC input. */
export function estimateClicksFromCPC(budget: number, cpc: number): number {
  if (cpc <= 0) return 0;
  return budget / cpc;
}

/** Estimate conversions from a CPA input. */
export function estimateConversionsFromCPA(budget: number, cpa: number): number {
  if (cpa <= 0) return 0;
  return budget / cpa;
}

/** Estimate ROAS given revenue and spend. */
export function estimateROAS(revenue: number, spend: number): number {
  if (spend <= 0) {
    return 0;
  }
  return revenue / spend;
}

const roundTo = (value: number, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const ensureFinite = (value: number) => (Number.isFinite(value) ? value : 0);

/**
 * Estimate impressions, clicks and conversions for a tactic using the available inputs.
 * Falls back to channel CTR and CVR benchmarks when explicit bid information is missing.
 */
export function estimateTacticPerformance(tactic: Tactic): MetricEstimates {
  const spend = Number.isFinite(tactic.budget) ? tactic.budget : 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;

  const estCpm = tactic.estCpm && Number.isFinite(tactic.estCpm) ? tactic.estCpm : undefined;
  const estCpc = tactic.estCpc && Number.isFinite(tactic.estCpc) ? tactic.estCpc : undefined;
  const estCpa = tactic.estCpa && Number.isFinite(tactic.estCpa) ? tactic.estCpa : undefined;

  if (estCpm) {
    impressions = estimateImpressionsFromCPM(spend, estCpm);
  }

  if (estCpc) {
    clicks = estimateClicksFromCPC(spend, estCpc);
  }

  if (estCpa) {
    conversions = estimateConversionsFromCPA(spend, estCpa);
  }

  if (!impressions && clicks) {
    const assumedCtr = CHANNEL_CTR_DEFAULTS[tactic.channel] ?? 0.005;
    impressions = clicks / assumedCtr;
  }

  if (!clicks && impressions) {
    const assumedCtr = CHANNEL_CTR_DEFAULTS[tactic.channel] ?? 0.005;
    clicks = impressions * assumedCtr;
  }

  if (!conversions && clicks) {
    const assumedCvr = CHANNEL_CVR_DEFAULTS[tactic.channel] ?? 0.02;
    conversions = clicks * assumedCvr;
  }

  return {
    impressions: ensureFinite(impressions),
    clicks: ensureFinite(clicks),
    conversions: ensureFinite(conversions),
  };
}

/** Calculate the number of calendar days between the two ISO dates, inclusive. */
export function daysInFlight(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diff = end.getTime() - start.getTime();
  return diff >= 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) + 1 : 0;
}

/** Compute a daily pacing figure for the provided spend and dates. */
export function calculateDailyPacing(budget: number, startIso: string, endIso: string): number {
  const days = daysInFlight(startIso, endIso);
  if (days <= 0) {
    return 0;
  }
  return budget / days;
}

/** Helper to estimate the revenue generated from conversions and an average order value. */
export function estimateRevenue(conversions: number, averageOrderValue: number): number {
  return conversions * averageOrderValue;
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  test('CPM, CPC and CPA estimators return positive values', () => {
    expect(estimateImpressionsFromCPM(1000, 10)).toBe(100000);
    expect(estimateClicksFromCPC(500, 2.5)).toBe(200);
    expect(estimateConversionsFromCPA(1200, 60)).toBe(20);
  });

  test('tactic performance falls back to CTR/CVR benchmarks', () => {
    const tactic: Tactic = {
      id: 't',
      channel: 'Social',
      budget: 1000,
      bidType: 'CPM',
      flightStart: '2024-01-01',
      flightEnd: '2024-01-31',
      estCpm: 10,
    };
    const performance = estimateTacticPerformance(tactic);
    expect(roundTo(performance.impressions)).toBe(100000);
    expect(roundTo(performance.clicks, 4)).toBe(roundTo(100000 * CHANNEL_CTR_DEFAULTS.Social, 4));
    expect(roundTo(performance.conversions, 4)).toBe(
      roundTo(performance.clicks * CHANNEL_CVR_DEFAULTS.Social, 4),
    );
  });

  test('daily pacing respects inclusive dates', () => {
    expect(daysInFlight('2024-01-01', '2024-01-01')).toBe(1);
    expect(calculateDailyPacing(3100, '2024-01-01', '2024-01-31')).toBeCloseTo(100, 6);
  });

  test('ROAS handles zero spend safely', () => {
    expect(estimateROAS(1000, 0)).toBe(0);
    expect(estimateROAS(2000, 1000)).toBe(2);
  });
}
