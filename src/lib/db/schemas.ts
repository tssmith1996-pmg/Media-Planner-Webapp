import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import {
  approvalEventSchema,
  audienceSchema as appAudienceSchema,
  campaignSchema as appCampaignSchema,
  creativeSchema as appCreativeSchema,
  deliveryActualSchema as appDeliveryActualSchema,
  flightSchema as appFlightSchema,
  lineItemSchema as appLineItemSchema,
  planMetaSchema as appPlanMetaSchema,
  planStatusSchema as appPlanStatusSchema,
  trackingSchema as appTrackingSchema,
  vendorSchema as appVendorSchema,
} from '@/lib/schemas';

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid ISO date',
});

const firestoreTimestamp = z.instanceof(Timestamp).transform((ts) => ts.toDate().toISOString());

export const orgSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  billing: z
    .object({
      plan: z.enum(['standard', 'enterprise']).default('standard'),
      cycle: z.enum(['monthly', 'annual']).default('monthly'),
    })
    .default({ plan: 'standard', cycle: 'monthly' }),
  settings: z
    .object({
      defaultCurrency: z.string().default('USD'),
      enableBigQuery: z.boolean().default(false),
    })
    .default({ defaultCurrency: 'USD', enableBigQuery: false }),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type Org = z.infer<typeof orgSchema>;

export const workspaceSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string().min(2),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD'),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type Workspace = z.infer<typeof workspaceSchema>;

const roleSchema = z.enum(['admin', 'planner', 'analyst', 'partner']);

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1),
  photoURL: z.string().url().optional(),
  orgRoles: z.record(roleSchema).default({}),
  workspaceRoles: z.record(roleSchema).default({}),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type AppUser = z.infer<typeof userSchema>;

export const planStateSchema = z.enum(['draft', 'proposed', 'approved', 'live', 'closed']);

export const planSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  state: planStateSchema,
  name: z.string().min(1),
  timeframe: z.object({ start: isoDate, end: isoDate }),
  currency: z.string().default('USD'),
  ownerId: z.string(),
  version: z.number().int().positive(),
  createdAt: isoDate,
  updatedAt: isoDate,
  createdBy: z.string(),
  updatedBy: z.string(),
  status: appPlanStatusSchema.default('Draft'),
  meta: appPlanMetaSchema.default({ name: '', code: '', version: 1 }),
  goal: z
    .object({
      budget: z.number().nonnegative(),
      reach: z.number().nonnegative(),
      frequency: z.number().nonnegative(),
    })
    .default({ budget: 0, reach: 0, frequency: 0 }),
  lastModified: isoDate,
  audit: z.array(approvalEventSchema).default([]),
  owner: z.string(),
  approver: z.string().optional(),
  campaigns: z.array(appCampaignSchema).default([]),
  flights: z.array(appFlightSchema).default([]),
  audiences: z.array(appAudienceSchema).default([]),
  vendors: z.array(appVendorSchema).default([]),
  creatives: z.array(appCreativeSchema).default([]),
  lineItems: z.array(appLineItemSchema).default([]),
  tracking: z.array(appTrackingSchema).default([]),
  deliveryActuals: z.array(appDeliveryActualSchema).default([]),
  scenarioOf: z.string().optional(),
});

export type PlanRecord = z.infer<typeof planSchema>;

export const planVersionSchema = z.object({
  id: z.string(),
  planId: z.string(),
  workspaceId: z.string(),
  version: z.number().int().positive(),
  diff: z.record(z.unknown()),
  createdBy: z.string(),
  createdAt: isoDate,
});

export type PlanVersion = z.infer<typeof planVersionSchema>;

export const tacticSchema = z.object({
  id: z.string(),
  planId: z.string(),
  workspaceId: z.string().optional(),
  channel: z.string(),
  market: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  budget: z.number().nonnegative(),
  targetKpis: z.record(z.unknown()).default({}),
  notes: z.string().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type TacticRecord = z.infer<typeof tacticSchema>;

export const insertionOrderSchema = z.object({
  id: z.string(),
  planId: z.string(),
  workspaceId: z.string(),
  vendor: z.string(),
  ioNumber: z.string(),
  status: z.enum(['draft', 'sent', 'signed']),
  fileRef: z.string().optional(),
  version: z.number().int().positive(),
  createdAt: isoDate,
});

export type InsertionOrder = z.infer<typeof insertionOrderSchema>;

export const connectionSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  provider: z.enum(['google_ads', 'ga4', 'meta_ads', 'ttd', 'dv360']).default('google_ads'),
  status: z.enum(['pending', 'authorized', 'error']),
  authRef: z.string(),
  config: z.record(z.unknown()),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type Connection = z.infer<typeof connectionSchema>;

export const syncRunSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  startedAt: isoDate,
  finishedAt: isoDate.optional(),
  status: z.enum(['queued', 'running', 'success', 'error', 'skipped']),
  stats: z
    .object({
      rowsUpserted: z.number().int().nonnegative().default(0),
      rowsDeleted: z.number().int().nonnegative().default(0),
    })
    .default({ rowsUpserted: 0, rowsDeleted: 0 }),
  error: z.string().optional(),
});

export type SyncRun = z.infer<typeof syncRunSchema>;

export const thresholdSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  entityRef: z.object({ type: z.string(), id: z.string() }),
  metric: z.string(),
  comparator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  value: z.number(),
  channelScope: z.string().optional(),
  emailRecipients: z.array(z.string().email()).default([]),
  createdAt: isoDate,
  createdBy: z.string(),
});

export type KpiThreshold = z.infer<typeof thresholdSchema>;

export const alertSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  thresholdId: z.string(),
  triggeredAt: isoDate,
  values: z.record(z.number()),
  resolvedAt: isoDate.optional(),
  ackBy: z.string().optional(),
});

export type Alert = z.infer<typeof alertSchema>;

export const dashboardSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  layout: z.array(z.object({ id: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
  tiles: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['timeseries', 'scorecard', 'table', 'pivot']),
      query: z.record(z.unknown()),
    }),
  ),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type Dashboard = z.infer<typeof dashboardSchema>;

export const reportSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  filters: z.record(z.unknown()),
  schedule: z
    .object({
      cadence: z.enum(['daily', 'weekly', 'monthly']),
      day: z.number().int().min(0).max(31).optional(),
      hour: z.number().int().min(0).max(23).default(3),
    })
    .optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export type Report = z.infer<typeof reportSchema>;

export const taskSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  type: z.enum(['review', 'io', 'pacing', 'integration', 'custom']),
  subject: z.string(),
  dueAt: isoDate.optional(),
  assigneeId: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).default('open'),
  createdAt: isoDate,
  createdBy: z.string(),
});

export type Task = z.infer<typeof taskSchema>;

export const auditLogSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  meta: z.record(z.unknown()).default({}),
  at: isoDate,
  workspaceId: z.string().optional(),
  orgId: z.string().optional(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export const normalizedTimestampSchema = z.union([isoDate, firestoreTimestamp]);
