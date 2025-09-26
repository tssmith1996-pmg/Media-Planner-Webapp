import { z } from 'zod';

const objectiveValues = ['Awareness', 'Consideration', 'Conversion'] as const;
const goalKpis = ['Reach', 'Impressions', 'Clicks', 'Conversions', 'ROAS'] as const;
const currencyValues = ['USD', 'AUD', 'EUR'] as const;
const tacticChannels = [
  'Search',
  'Social',
  'Display',
  'Video',
  'Audio',
  'DOOH',
  'Affiliate',
  'Retail Media',
  'Other',
] as const;
const bidTypes = ['CPM', 'CPC', 'CPA'] as const;
const planStatuses = ['Draft', 'Submitted', 'Approved'] as const;

export const goalSchema = z.object({
  kpi: z.enum(goalKpis),
  target: z.number().nonnegative(),
});

export const campaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  objective: z.enum(objectiveValues),
  startDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'Invalid start date',
  }),
  endDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'Invalid end date',
  }),
  currency: z.enum(currencyValues),
  goal: goalSchema,
});

export const tacticSchema = z
  .object({
    id: z.string().min(1),
    channel: z.enum(tacticChannels),
    vendor: z.string().optional(),
    flightStart: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Invalid start date',
    }),
    flightEnd: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Invalid end date',
    }),
    budget: z.number().min(0, { message: 'Budget must be ≥ 0' }),
    bidType: z.enum(bidTypes),
    estCpm: z.number().positive().optional(),
    estCpc: z.number().positive().optional(),
    estCpa: z.number().positive().optional(),
    notes: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const startMs = Date.parse(value.flightStart);
    const endMs = Date.parse(value.flightEnd);
    if (startMs > endMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Flight start must be on or before end date',
        path: ['flightStart'],
      });
    }
    if (value.bidType === 'CPM' && !value.estCpm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide estimated CPM',
        path: ['estCpm'],
      });
    }
    if (value.bidType === 'CPC' && !value.estCpc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide estimated CPC',
        path: ['estCpc'],
      });
    }
    if (value.bidType === 'CPA' && !value.estCpa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide estimated CPA',
        path: ['estCpa'],
      });
    }
  });

export const constraintSchema = z.object({
  dailyPacing: z.boolean().optional(),
  maxSharePerChannel: z.number().min(0).max(1).optional(),
  minTacticBudget: z.number().min(0).optional(),
});

export const planSchema = z
  .object({
    id: z.string().min(1),
    campaign: campaignSchema,
    tactics: z.array(tacticSchema),
    constraints: constraintSchema,
    status: z.enum(planStatuses),
    lastModified: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
      message: 'Invalid last modified timestamp',
    }),
  })
  .superRefine((value, ctx) => {
    const campaignStart = Date.parse(value.campaign.startDate);
    const campaignEnd = Date.parse(value.campaign.endDate);
    value.tactics.forEach((tactic, index) => {
      const start = Date.parse(tactic.flightStart);
      const end = Date.parse(tactic.flightEnd);
      if (start < campaignStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flight start before campaign',
          path: ['tactics', index, 'flightStart'],
        });
      }
      if (end > campaignEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flight end after campaign',
          path: ['tactics', index, 'flightEnd'],
        });
      }
      if (value.constraints.minTacticBudget && tactic.budget < value.constraints.minTacticBudget) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Budget must be ≥ ${value.constraints.minTacticBudget}`,
          path: ['tactics', index, 'budget'],
        });
      }
    });
  });

export type Campaign = z.infer<typeof campaignSchema>;
export type Tactic = z.infer<typeof tacticSchema>;
export type Plan = z.infer<typeof planSchema>;
export type PlanStatus = (typeof planStatuses)[number];
export type CampaignGoalKpi = (typeof goalKpis)[number];
export type Objective = (typeof objectiveValues)[number];
export type TacticChannel = (typeof tacticChannels)[number];
export type BidType = (typeof bidTypes)[number];

export const tacticCsvHeaders: Array<keyof Tactic> = [
  'id',
  'channel',
  'vendor',
  'flightStart',
  'flightEnd',
  'budget',
  'bidType',
  'estCpm',
  'estCpc',
  'estCpa',
  'notes',
];
