import { campaignSchema, planSchema, tacticSchema } from '@/lib/schemas';

const campaigns = [
  campaignSchema.parse({
    id: 'cmp-1',
    name: 'Q4 Brand Awareness',
    startDate: '2025-10-01',
    endDate: '2025-12-31',
    budget: 500000,
    objective: 'Reach 5M impressions across AU market.',
  }),
  campaignSchema.parse({
    id: 'cmp-2',
    name: 'Holiday Retargeting',
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    budget: 250000,
    objective: 'Drive conversions from holiday audiences.',
  }),
];

const tactics = [
  tacticSchema.parse({
    id: 'tac-1',
    campaignId: 'cmp-1',
    name: 'YouTube Masthead',
    channel: 'Video',
    startDate: '2025-10-01',
    endDate: '2025-10-31',
    budget: 200000,
    bidType: 'CPM',
    goalImpressions: 2000000,
    notes: 'Hero video to build hype before launch.',
  }),
  tacticSchema.parse({
    id: 'tac-2',
    campaignId: 'cmp-1',
    name: 'Programmatic Display',
    channel: 'Display',
    startDate: '2025-10-01',
    endDate: '2025-12-31',
    budget: 150000,
    bidType: 'CPM',
    goalImpressions: 2500000,
  }),
  tacticSchema.parse({
    id: 'tac-3',
    campaignId: 'cmp-2',
    name: 'Search Non-Brand',
    channel: 'Search',
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    budget: 125000,
    bidType: 'CPC',
    goalClicks: 60000,
  }),
  tacticSchema.parse({
    id: 'tac-4',
    campaignId: 'cmp-2',
    name: 'Paid Social Carousel',
    channel: 'Paid Social',
    startDate: '2025-11-15',
    endDate: '2025-12-26',
    budget: 90000,
    bidType: 'CPA',
    goalConversions: 8000,
  }),
];

export const plans = [
  planSchema.parse({
    id: 'plan-1',
    meta: { name: 'Q4 Launch – AU', code: 'Q4-AU', version: 1 },
    status: 'Draft',
    goal: { budget: 750000, reach: 5200000, frequency: 3 },
    campaigns,
    tactics,
    lastModified: new Date().toISOString(),
    audit: [
      {
        id: 'audit-1',
        actor: 'Taylor Planner',
        action: 'created',
        timestamp: new Date().toISOString(),
      },
    ],
    owner: 'Taylor Planner',
    approver: undefined,
  }),
];

export const seedData = {
  campaigns,
  plans,
};
