import { z } from 'zod';
import { createId } from './id';

export const approvalActionSchema = z.enum([
  'created',
  'edited',
  'submitted',
  'approved',
  'rejected',
  'reverted',
  'duplicated',
]);

export type ApprovalAction = z.infer<typeof approvalActionSchema>;

export const approvalEventSchema = z.object({
  id: z.string().default(() => createId('audit')),
  actor: z.string(),
  action: approvalActionSchema,
  comment: z.string().optional(),
  timestamp: z.string(),
});

export type ApprovalEvent = z.infer<typeof approvalEventSchema>;

export const tacticSchema = z
  .object({
    id: z.string().default(() => createId('tactic')),
    campaignId: z.string(),
    name: z.string(),
    channel: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    budget: z.number().nonnegative(),
    bidType: z.enum(['CPM', 'CPC', 'CPA']),
    goalImpressions: z.number().nonnegative().optional(),
    goalClicks: z.number().nonnegative().optional(),
    goalConversions: z.number().nonnegative().optional(),
    notes: z.string().optional(),
    targetKpis: z.record(z.unknown()).default({}),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.endDate) < new Date(value.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      });
    }
    if (value.bidType === 'CPM' && value.goalImpressions === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['goalImpressions'],
        message: 'Impressions required for CPM tactics',
      });
    }
    if (value.bidType === 'CPC' && value.goalClicks === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['goalClicks'],
        message: 'Clicks required for CPC tactics',
      });
    }
    if (value.bidType === 'CPA' && value.goalConversions === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['goalConversions'],
        message: 'Conversions required for CPA tactics',
      });
    }
  });

export type Tactic = z.infer<typeof tacticSchema>;

export const campaignSchema = z
  .object({
    id: z.string().default(() => createId('campaign')),
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    budget: z.number().nonnegative(),
    objective: z.string(),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.endDate) < new Date(value.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'Campaign end date must be after start date',
      });
    }
  });

export type Campaign = z.infer<typeof campaignSchema>;

export const planStatusSchema = z.enum(['Draft', 'Submitted', 'Approved', 'Rejected', 'Archived']);

export type PlanStatus = z.infer<typeof planStatusSchema>;

export const planMetaSchema = z.object({
  name: z.string(),
  code: z.string(),
  version: z.number().int().positive(),
});

export const planSchema = z
  .object({
    id: z.string().default(() => createId('plan')),
    meta: planMetaSchema,
    status: planStatusSchema,
    goal: z.object({
      budget: z.number().nonnegative(),
      reach: z.number().nonnegative(),
      frequency: z.number().nonnegative(),
    }),
    campaigns: z.array(campaignSchema),
    tactics: z.array(tacticSchema),
    lastModified: z.string(),
    audit: z.array(approvalEventSchema),
    owner: z.string(),
    approver: z.string().optional(),
  })
  .superRefine((plan, ctx) => {
    const campaignMap = new Map(plan.campaigns.map((campaign) => [campaign.id, campaign]));
    for (const tactic of plan.tactics) {
      const campaign = campaignMap.get(tactic.campaignId);
      if (!campaign) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tactic ${tactic.name} references missing campaign`,
          path: ['tactics'],
        });
        continue;
      }
      if (new Date(tactic.startDate) < new Date(campaign.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tactic ${tactic.name} starts before campaign ${campaign.name}`,
          path: ['tactics'],
        });
      }
      if (new Date(tactic.endDate) > new Date(campaign.endDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tactic ${tactic.name} ends after campaign ${campaign.name}`,
          path: ['tactics'],
        });
      }
    }
  });

export type Plan = z.infer<typeof planSchema>;

export function createDraftPlan(overrides?: Partial<Plan>): Plan {
  const now = new Date().toISOString();
  const plan = planSchema.parse({
    id: createId('plan'),
    meta: { name: 'New Plan', code: `PLAN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, version: 1 },
    status: 'Draft',
    goal: { budget: 0, reach: 0, frequency: 0 },
    campaigns: [],
    tactics: [],
    lastModified: now,
    audit: [
      {
        id: createId('audit'),
        actor: overrides?.owner ?? 'Taylor Planner',
        action: 'created',
        timestamp: now,
      },
    ],
    owner: overrides?.owner ?? 'Taylor Planner',
    approver: undefined,
    ...overrides,
  });
  return plan;
}
