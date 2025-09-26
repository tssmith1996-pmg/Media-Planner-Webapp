import { describe, expect, it } from 'vitest';
import { calculatePlanTotals, prorateTactic } from '@/lib/math';
import { planSchema } from '@/lib/schemas';
import { seedData } from '@/data/seed';

const plan = planSchema.parse(seedData.plans[0]);

describe('calculatePlanTotals', () => {
  it('sums budgets and impressions across channels', () => {
    const totals = calculatePlanTotals(plan);
    expect(totals.totalBudget).toBeGreaterThan(0);
    expect(totals.channels.length).toBeGreaterThan(0);
    const sumChannels = totals.channels.reduce((acc, channel) => acc + channel.budget, 0);
    expect(Math.round(sumChannels)).toEqual(Math.round(totals.totalBudget));
  });
});

describe('prorateTactic', () => {
  it('divides budget evenly across buckets', () => {
    const tactic = plan.tactics[0];
    const distribution = prorateTactic(tactic, 4);
    const total = distribution.reduce((acc, value) => acc + value, 0);
    expect(distribution.length).toBeGreaterThan(0);
    expect(Math.round(total)).toEqual(Math.round(tactic.budget));
  });
});
