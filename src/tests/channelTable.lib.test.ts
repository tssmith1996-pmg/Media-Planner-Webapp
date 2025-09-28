import { describe, expect, it } from 'vitest';
import { plans } from '@/data/seed';
import {
  buildFlightingContexts,
  computeChannelSummaries,
  setFieldValue,
  validateField,
  getFieldValue,
} from '@/lib/channelTable';
import type { Channel } from '@/lib/schemas';

const plan = plans[0];

describe('channel table helpers', () => {
  it('computes channel rollups and budget share', () => {
    const summaries = computeChannelSummaries(plan);
    const tvSummary = summaries.find((summary) => summary.channel === 'TV');
    expect(tvSummary).toBeDefined();
    expect(tvSummary?.totalPlannedCost).toBeGreaterThan(0);
    expect(tvSummary?.budgetPercent).toBeCloseTo(
      (tvSummary?.totalPlannedCost ?? 0) / plan.goal.budget,
      5,
    );
  });

  it('sorts flight contexts by start date', () => {
    const contexts = buildFlightingContexts(plan, plan.lineItems[0].channel);
    const dates = contexts
      .map((context) => context.flight?.start_date)
      .filter((value): value is string => Boolean(value));
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('validates required fields before committing updates', () => {
    const channel: Channel = plan.lineItems[0].channel;
    const context = buildFlightingContexts(plan, channel)[0];
    const issue = validateField(channel, context, 'start_date', '');
    expect(issue).not.toBeNull();
    const result = setFieldValue(channel, context, 'planned_cost', 9999);
    const updatedValue = getFieldValue(channel, {
      plan: result.plan,
      lineItem: result.lineItem,
      flight: result.flight,
      vendor: result.vendor,
      audience: result.audience,
    }, 'planned_cost');
    expect(updatedValue).toBe(9999);
  });
});
