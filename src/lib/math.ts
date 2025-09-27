import { differenceInDays } from './mathHelpers';
import type { Flight, LineItem, Plan } from './schemas';

type ChannelSummary = {
  channel: string;
  budget: number;
  units: number;
  blendedRate: number;
};

export type PlanTotals = {
  totalBudget: number;
  totalUnits: number;
  blendedRate: number;
  channels: ChannelSummary[];
};

export function calculatePlanTotals(plan: Plan): PlanTotals {
  const channelMap = new Map<string, ChannelSummary>();

  for (const lineItem of plan.lineItems) {
    const existing = channelMap.get(lineItem.channel) ?? {
      channel: lineItem.channel,
      budget: 0,
      units: 0,
      blendedRate: 0,
    };

    existing.budget += lineItem.cost_planned;
    existing.units += lineItem.units_planned;
    channelMap.set(lineItem.channel, existing);
  }

  const channels = Array.from(channelMap.values()).map((summary) => ({
    ...summary,
    blendedRate: summary.units > 0 ? summary.budget / summary.units : 0,
  }));

  const totalBudget = channels.reduce((acc, channel) => acc + channel.budget, 0);
  const totalUnits = channels.reduce((acc, channel) => acc + channel.units, 0);

  return {
    channels,
    totalBudget,
    totalUnits,
    blendedRate: totalUnits > 0 ? totalBudget / totalUnits : 0,
  };
}

export function buildPacingWarnings(plan: Plan) {
  const warnings: string[] = [];

  for (const lineItem of plan.lineItems) {
    const flight = plan.flights.find((item) => item.flight_id === lineItem.flight_id);
    if (!flight) continue;
    const campaign = plan.campaigns.find((item) => item.campaign_id === flight.campaign_id);
    const totalDays = differenceInDays(flight.end_date, flight.start_date) + 1;
    if (totalDays <= 0) continue;
    const flightBudget = flight.budget_total;
    if (flightBudget > 0 && lineItem.cost_planned / flightBudget > 0.6) {
      warnings.push(`${lineItem.line_item_id} captures more than 60% of flight ${flight.flight_id} budget.`);
    }
    if (campaign) {
      const otherFlights = plan.flights.filter((item) => item.campaign_id === campaign.campaign_id);
      const campaignBudget = otherFlights.reduce((acc, current) => acc + current.budget_total, 0);
      if (campaignBudget > 0 && lineItem.cost_planned / campaignBudget > 0.35) {
        warnings.push(`${lineItem.line_item_id} is a large share of campaign ${campaign.brand}.`);
      }
    }
  }

  return warnings;
}

export function prorateLineItem(lineItem: LineItem, flight: Flight | undefined, buckets: number): number[] {
  if (!flight || buckets <= 0) return [];
  const totalDays = differenceInDays(flight.end_date, flight.start_date) + 1;
  if (totalDays <= 0) return [];

  const dailyBudget = lineItem.cost_planned / totalDays;
  const bucketSize = Math.max(1, Math.ceil(totalDays / buckets));
  const distribution: number[] = [];

  for (let index = 0; index < buckets; index += 1) {
    const startDay = index * bucketSize;
    const remaining = Math.max(totalDays - startDay, 0);
    const daysInBucket = Math.min(bucketSize, remaining);
    distribution.push(daysInBucket > 0 ? dailyBudget * daysInBucket : 0);
  }

  return distribution;
}
