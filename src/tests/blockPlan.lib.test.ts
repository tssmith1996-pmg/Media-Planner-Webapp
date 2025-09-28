import { describe, expect, it } from 'vitest';
import { plans } from '@/data/seed';
import {
  changePlanWeekStart,
  ensurePlanBlockPlans,
  syncBlockPlanToFlight,
  toggleBlockPlanWeek,
} from '@/lib/blockPlan';

function clonePlan() {
  return ensurePlanBlockPlans(plans[0]);
}

describe('block plan helpers', () => {
  it('generates block plan weeks from flight dates', () => {
    const plan = clonePlan();
    const lineItem = plan.lineItems[0];
    const synced = syncBlockPlanToFlight(plan, lineItem.line_item_id);
    const refreshed = synced.lineItems.find((item) => item.line_item_id === lineItem.line_item_id);
    expect(refreshed?.block_plan?.weeks.length).toBeGreaterThan(0);
    expect(refreshed?.block_plan?.weeks.some((week) => week.active)).toBe(true);
  });

  it('updates flight boundaries when toggling weeks', () => {
    const base = clonePlan();
    const lineItem = base.lineItems[0];
    const ensured = syncBlockPlanToFlight(base, lineItem.line_item_id);
    const refreshed = ensured.lineItems.find((item) => item.line_item_id === lineItem.line_item_id);
    const activeWeeks = refreshed?.block_plan?.weeks.filter((week) => week.active) ?? [];
    expect(activeWeeks.length).toBeGreaterThan(1);
    const firstWeek = activeWeeks[0];
    const toggled = toggleBlockPlanWeek(ensured, lineItem.line_item_id, firstWeek.week_start);
    const updatedLineItem = toggled.lineItems.find((item) => item.line_item_id === lineItem.line_item_id);
    const updatedFlight = toggled.flights.find((flight) => flight.flight_id === updatedLineItem?.flight_id);
    expect(updatedLineItem?.block_plan?.weeks.some((week) => week.active)).toBe(true);
    expect(updatedFlight?.start_date).not.toBe(firstWeek.week_start);
    expect(new Date(toggled.end_date)).toBeInstanceOf(Date);
  });

  it('realigns pulses when week start changes', () => {
    const base = clonePlan();
    const ensured = syncBlockPlanToFlight(base, base.lineItems[0].line_item_id);
    const switched = changePlanWeekStart(ensured, 'Sunday');
    expect(switched.week_start_day).toBe('Sunday');
    const sampleLine = switched.lineItems[0];
    expect(sampleLine.block_plan?.weeks.length).toBeGreaterThan(0);
  });
});
