import { planSchema, type BlockPlan, type LineItem, type Plan, type WeekStartDay } from '@/lib/schemas';
import { addDays, enumeratePlanWeeks, startOfWeek, toIsoDate } from '@/lib/date';
import type { Flight } from '@/lib/schemas';

function clonePlan(plan: Plan): Plan {
  return planSchema.parse(JSON.parse(JSON.stringify(plan)));
}

function ensureBlockPlanContainer(lineItem: LineItem): BlockPlan {
  if (!lineItem.block_plan) {
    lineItem.block_plan = { version: 1, week_unit: 'plan-week', weeks: [] };
  }
  return lineItem.block_plan;
}

function buildActiveSetFromFlight(flight: Flight | undefined, plan: Plan): Set<string> {
  const active = new Set<string>();
  if (!flight) return active;
  const weeks = enumeratePlanWeeks(plan.start_date, plan.end_date, plan.week_start_day);
  const flightStart = new Date(flight.start_date);
  const flightEnd = new Date(flight.end_date);
  for (const week of weeks) {
    const weekStart = week.start.getTime();
    const weekEnd = week.end.getTime();
    if (weekEnd < flightStart.getTime()) continue;
    if (weekStart > flightEnd.getTime()) continue;
    active.add(week.key);
  }
  return active;
}

function alignBlockPlanWeeks(
  plan: Plan,
  lineItem: LineItem,
  flight: Flight | undefined,
  preserveExisting: boolean,
) {
  const blockPlan = ensureBlockPlanContainer(lineItem);
  const weeks = enumeratePlanWeeks(plan.start_date, plan.end_date, plan.week_start_day);
  const existing = new Map(blockPlan.weeks.map((week) => [week.week_start, week.active]));
  const fallback = buildActiveSetFromFlight(flight, plan);
  const nextWeeks = weeks.map((week) => {
    const preserved = existing.get(week.key);
    const active = preserveExisting
      ? preserved ?? fallback.has(week.key)
      : fallback.has(week.key);
    return { week_start: week.key, active };
  });

  if (!nextWeeks.some((week) => week.active) && fallback.size > 0) {
    blockPlan.weeks = weeks.map((week) => ({ week_start: week.key, active: fallback.has(week.key) }));
  } else {
    blockPlan.weeks = nextWeeks;
  }
}

function collectActiveWeekStarts(lineItem: LineItem, weekStart: WeekStartDay): Set<string> {
  const active = new Set<string>();
  if (!lineItem.block_plan) return active;
  for (const week of lineItem.block_plan.weeks) {
    if (!week.active) continue;
    const start = startOfWeek(new Date(week.week_start), weekStart);
    active.add(toIsoDate(start));
  }
  return active;
}

function updateFlightFromBlockPlan(lineItem: LineItem, flight: Flight | undefined) {
  if (!flight || !lineItem.block_plan) return;
  const activeWeeks = lineItem.block_plan.weeks.filter((week) => week.active);
  if (activeWeeks.length === 0) {
    return;
  }
  activeWeeks.sort((a, b) => a.week_start.localeCompare(b.week_start));
  const first = activeWeeks[0];
  const last = activeWeeks[activeWeeks.length - 1];
  flight.start_date = first.week_start;
  flight.end_date = toIsoDate(addDays(new Date(last.week_start), 6));
}

export function ensurePlanBlockPlans(plan: Plan): Plan {
  const next = clonePlan(plan);
  for (const lineItem of next.lineItems) {
    const flight = next.flights.find((item) => item.flight_id === lineItem.flight_id);
    alignBlockPlanWeeks(next, lineItem, flight, true);
  }
  return planSchema.parse(next);
}

export function syncBlockPlanToFlight(plan: Plan, lineItemId: string): Plan {
  const next = clonePlan(plan);
  const lineItem = next.lineItems.find((item) => item.line_item_id === lineItemId);
  if (!lineItem) return plan;
  const flight = next.flights.find((item) => item.flight_id === lineItem.flight_id);
  alignBlockPlanWeeks(next, lineItem, flight, false);
  updateFlightFromBlockPlan(lineItem, flight);
  return updatePlanTimeline(next);
}

export function toggleBlockPlanWeek(plan: Plan, lineItemId: string, weekStart: string): Plan {
  const next = clonePlan(plan);
  const lineItem = next.lineItems.find((item) => item.line_item_id === lineItemId);
  if (!lineItem) return plan;
  const flight = next.flights.find((item) => item.flight_id === lineItem.flight_id);
  alignBlockPlanWeeks(next, lineItem, flight, true);
  const blockPlan = ensureBlockPlanContainer(lineItem);
  const target = blockPlan.weeks.find((week) => week.week_start === weekStart);
  if (!target) return plan;
  const nextState = !target.active;
  target.active = nextState;
  if (!blockPlan.weeks.some((week) => week.active)) {
    target.active = true;
    return plan;
  }
  updateFlightFromBlockPlan(lineItem, flight);
  return updatePlanTimeline(next);
}

export function changePlanWeekStart(plan: Plan, weekStart: WeekStartDay): Plan {
  if (plan.week_start_day === weekStart) return plan;
  const next = clonePlan(plan);
  next.week_start_day = weekStart;
  for (const lineItem of next.lineItems) {
    const flight = next.flights.find((item) => item.flight_id === lineItem.flight_id);
    const activeWeeks = collectActiveWeekStarts(lineItem, weekStart);
    const weeks = enumeratePlanWeeks(next.start_date, next.end_date, weekStart);
    ensureBlockPlanContainer(lineItem);
    lineItem.block_plan!.weeks = weeks.map((week) => ({
      week_start: week.key,
      active: activeWeeks.size > 0 ? activeWeeks.has(week.key) : false,
    }));
    if (!lineItem.block_plan!.weeks.some((week) => week.active)) {
      alignBlockPlanWeeks(next, lineItem, flight, false);
    }
    updateFlightFromBlockPlan(lineItem, flight);
  }
  return updatePlanTimeline(next);
}

export function updatePlanTimeline(plan: Plan): Plan {
  const next = clonePlan(plan);
  if (next.flights.length === 0) {
    return planSchema.parse(next);
  }
  const startDates = next.flights.map((flight) => flight.start_date).sort();
  const endDates = next.flights.map((flight) => flight.end_date).sort();
  next.start_date = startDates[0];
  next.end_date = endDates[endDates.length - 1];
  return planSchema.parse(next);
}
