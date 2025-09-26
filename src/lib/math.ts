import { differenceInDays } from './mathHelpers';
import { Plan, Tactic } from './schemas';

type ChannelSummary = {
  channel: string;
  budget: number;
  impressions: number;
  cpm: number;
};

export type PlanTotals = {
  totalBudget: number;
  totalImpressions: number;
  cpm: number;
  channels: ChannelSummary[];
};

export function calculatePlanTotals(plan: Plan): PlanTotals {
  const channelMap = new Map<string, ChannelSummary>();

  for (const tactic of plan.tactics) {
    const entry = channelMap.get(tactic.channel) ?? {
      channel: tactic.channel,
      budget: 0,
      impressions: 0,
      cpm: 0,
    };

    entry.budget += tactic.budget;
    entry.impressions += tactic.goalImpressions ?? 0;
    channelMap.set(tactic.channel, entry);
  }

  const channels = Array.from(channelMap.values()).map((summary) => ({
    ...summary,
    cpm: summary.impressions > 0 ? (summary.budget / summary.impressions) * 1000 : 0,
  }));

  const totalBudget = channels.reduce((acc, channel) => acc + channel.budget, 0);
  const totalImpressions = channels.reduce((acc, channel) => acc + channel.impressions, 0);

  return {
    channels,
    totalBudget,
    totalImpressions,
    cpm: totalImpressions > 0 ? (totalBudget / totalImpressions) * 1000 : 0,
  };
}

export function buildPacingWarnings(plan: Plan) {
  const warnings: string[] = [];
  for (const tactic of plan.tactics) {
    const campaign = plan.campaigns.find((item) => item.id === tactic.campaignId);
    if (!campaign) continue;
    const totalDays = differenceInDays(campaign.endDate, campaign.startDate) + 1;
    const tacticDays = differenceInDays(tactic.endDate, tactic.startDate) + 1;
    if (tacticDays < totalDays / 2) {
      warnings.push(`${tactic.name} flight is shorter than half of campaign ${campaign.name}.`);
    }
    if (tactic.budget / campaign.budget > 0.5) {
      warnings.push(`${tactic.name} captures more than half of ${campaign.name} budget.`);
    }
  }
  return warnings;
}

export function prorateTactic(tactic: Tactic, buckets: number): number[] {
  const totalDays = differenceInDays(tactic.endDate, tactic.startDate) + 1;
  if (totalDays <= 0 || buckets <= 0) return [];
  const daily = tactic.budget / totalDays;
  const bucketSize = Math.ceil(totalDays / buckets);
  const distribution: number[] = [];
  for (let index = 0; index < buckets; index += 1) {
    const daysInBucket = Math.min(bucketSize, totalDays - index * bucketSize);
    if (daysInBucket <= 0) {
      distribution.push(0);
    } else {
      distribution.push(daily * daysInBucket);
    }
  }
  return distribution;
}
