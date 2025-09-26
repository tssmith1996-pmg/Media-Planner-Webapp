import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Store } from './types';
import { getFirebaseServices } from '@/lib/firebase';
import { db, ensureUserRecord, withOrgScope } from '@/lib/db';
import {
  type AppUser,
  type PlanRecord,
  planSchema as planRecordSchema,
  workspaceSchema,
  orgSchema,
} from '@/lib/db/schemas';
import { createConverter } from '@/lib/db/converters';
import { ENV } from '@/app/env';
import { createDraftPlan, planSchema, type Plan } from '@/lib/schemas';
import { createId } from '@/lib/id';
import type { ScopedContext } from '@/lib/db';

const statusToState: Record<Plan['status'], PlanRecord['state']> = {
  Draft: 'draft',
  Submitted: 'proposed',
  Approved: 'approved',
  Rejected: 'closed',
  Archived: 'closed',
};

const stateToStatus: Record<PlanRecord['state'], Plan['status']> = {
  draft: 'Draft',
  proposed: 'Submitted',
  approved: 'Approved',
  live: 'Approved',
  closed: 'Archived',
};

const workspaceConverter = createConverter(workspaceSchema);
const orgConverter = createConverter(orgSchema);

async function bootstrapTenant() {
  const { firestore } = getFirebaseServices();
  const now = new Date().toISOString();
  const orgRef = doc(firestore, 'orgs', ENV.defaultOrgId).withConverter(orgConverter);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) {
    await setDoc(orgRef, {
      id: ENV.defaultOrgId,
      name: 'Demo Organization',
      billing: { plan: 'standard', cycle: 'monthly' },
      settings: { defaultCurrency: 'USD', enableBigQuery: false },
      createdAt: now,
      updatedAt: now,
    });
  }
  const workspaceRef = doc(firestore, 'workspaces', ENV.defaultWorkspaceId).withConverter(workspaceConverter);
  const workspaceSnap = await getDoc(workspaceRef);
  if (!workspaceSnap.exists()) {
    await setDoc(workspaceRef, {
      id: ENV.defaultWorkspaceId,
      orgId: ENV.defaultOrgId,
      name: 'Demo Workspace',
      timezone: 'UTC',
      currency: 'USD',
      createdAt: now,
      updatedAt: now,
    });
  }
}

function buildUser(): AppUser {
  const { auth } = getFirebaseServices();
  const current = auth.currentUser;
  const now = new Date().toISOString();
  return {
    id: current?.uid ?? 'demo-user',
    email: current?.email ?? 'demo@example.com',
    displayName: current?.displayName ?? 'Demo Planner',
    photoURL: current?.photoURL ?? undefined,
    orgRoles: { [ENV.defaultOrgId]: 'admin' },
    workspaceRoles: { [ENV.defaultWorkspaceId]: 'admin' },
    createdAt: now,
    updatedAt: now,
  };
}

async function withScope<T>(callback: (scope: ScopedContext) => Promise<T>): Promise<T> {
  await bootstrapTenant();
  const user = buildUser();
  await ensureUserRecord(user);
  return withOrgScope(
    {
      user,
      orgId: ENV.defaultOrgId,
      workspaceId: ENV.defaultWorkspaceId,
    },
    callback,
  );
}

function deriveTimeframe(plan: PlanRecord | Plan) {
  const tactics = 'tactics' in plan ? plan.tactics : [];
  const startDates = tactics.map((tactic) => new Date(tactic.startDate).getTime());
  const endDates = tactics.map((tactic) => new Date(tactic.endDate).getTime());
  const fallback = new Date().toISOString();
  const start = startDates.length ? new Date(Math.min(...startDates)).toISOString() : fallback;
  const end = endDates.length ? new Date(Math.max(...endDates)).toISOString() : fallback;
  return { start, end };
}

function recordToPlan(record: PlanRecord): Plan {
  const plan = planSchema.parse({
    id: record.id,
    meta: record.meta,
    status: record.status ?? stateToStatus[record.state],
    goal: record.goal,
    campaigns: record.campaigns,
    tactics: record.tactics,
    lastModified: record.lastModified ?? record.updatedAt,
    audit: record.audit,
    owner: record.owner ?? record.ownerId,
    approver: record.approver,
  });
  return plan;
}

function planToRecord(plan: Plan, scope: ScopedContext, previous?: PlanRecord): PlanRecord {
  const now = new Date().toISOString();
  const timeframe = previous?.timeframe ?? deriveTimeframe(plan);
  const createdAt = previous?.createdAt ?? plan.audit[0]?.timestamp ?? now;
  const createdBy = previous?.createdBy ?? plan.audit[0]?.actor ?? plan.owner ?? scope.user.id;
  const updatedBy = plan.audit.length ? plan.audit[plan.audit.length - 1].actor : scope.user.id;
  const state = statusToState[plan.status] ?? previous?.state ?? 'draft';
  return planRecordSchema.parse({
    id: plan.id,
    workspaceId: scope.workspaceId ?? ENV.defaultWorkspaceId,
    state,
    name: plan.meta.name,
    timeframe,
    currency: previous?.currency ?? 'USD',
    ownerId: plan.owner ?? previous?.ownerId ?? scope.user.id,
    version: plan.meta.version,
    createdAt,
    updatedAt: plan.lastModified ?? now,
    createdBy,
    updatedBy,
    meta: plan.meta,
    goal: plan.goal,
    lastModified: plan.lastModified ?? now,
    audit: plan.audit,
    owner: plan.owner ?? previous?.owner ?? scope.user.id,
    approver: plan.approver ?? previous?.approver,
    campaigns: plan.campaigns,
    tactics: plan.tactics.map((tactic) => ({
      ...tactic,
      targetKpis: (tactic as typeof tactic & { targetKpis?: Record<string, unknown> }).targetKpis ?? {},
    })),
    scenarioOf: previous?.scenarioOf,
    status: plan.status,
  });
}

export function FirebaseAdapter(): Store {
  return {
    async listPlans() {
      return withScope(async (scope) => {
        const records = await db.listPlans(scope);
        return records.map(recordToPlan);
      });
    },
    async getPlan(id) {
      if (!id) return undefined;
      return withScope(async (scope) => {
        const record = await db.getPlan(scope, id);
        return record ? recordToPlan(record) : undefined;
      });
    },
    async savePlan(plan) {
      return withScope(async (scope) => {
        const existing = await db.getPlan(scope, plan.id);
        const record = planToRecord(plan, scope, existing);
        await db.upsertPlan(scope, record);
        return recordToPlan(record);
      });
    },
    async createPlan(base) {
      return withScope(async (scope) => {
        const draft = createDraftPlan(base);
        const record = planToRecord(draft, scope);
        const created = await db.createPlan(scope, record);
        return recordToPlan(created);
      });
    },
    async duplicatePlan(id, actor) {
      return withScope(async (scope) => {
        const original = await db.getPlan(scope, id);
        if (!original) return undefined;
        const now = new Date().toISOString();
        const plan = recordToPlan(original);
        const duplicated: Plan = planSchema.parse({
          ...plan,
          id: createId('plan'),
          meta: {
            ...plan.meta,
            version: plan.meta.version + 1,
            name: `${plan.meta.name} (Copy)`,
          },
          status: 'Draft',
          lastModified: now,
          audit: [
            ...plan.audit,
            { id: createId('audit'), actor, action: 'duplicated', timestamp: now },
          ],
        });
        const record = planToRecord(duplicated, scope);
        const saved = await db.createPlan(scope, record);
        return recordToPlan(saved);
      });
    },
    async submitPlan(id, actor, comment) {
      return withScope(async (scope) => {
        const record = await db.getPlan(scope, id);
        if (!record) return undefined;
        const plan = recordToPlan(record);
        const now = new Date().toISOString();
        const updated: Plan = planSchema.parse({
          ...plan,
          status: 'Submitted',
          lastModified: now,
          audit: [
            ...plan.audit,
            { id: createId('audit'), actor, action: 'submitted', comment, timestamp: now },
          ],
        });
        const nextRecord = planToRecord(updated, scope, record);
        await db.upsertPlan(scope, nextRecord);
        return recordToPlan(nextRecord);
      });
    },
    async approvePlan(id, actor, comment) {
      return withScope(async (scope) => {
        const record = await db.getPlan(scope, id);
        if (!record) return undefined;
        const plan = recordToPlan(record);
        const now = new Date().toISOString();
        const updated: Plan = planSchema.parse({
          ...plan,
          status: 'Approved',
          approver: actor,
          lastModified: now,
          audit: [
            ...plan.audit,
            { id: createId('audit'), actor, action: 'approved', comment, timestamp: now },
          ],
        });
        const nextRecord = planToRecord(updated, scope, record);
        await db.upsertPlan(scope, nextRecord);
        return recordToPlan(nextRecord);
      });
    },
    async rejectPlan(id, actor, comment) {
      return withScope(async (scope) => {
        const record = await db.getPlan(scope, id);
        if (!record) return undefined;
        const plan = recordToPlan(record);
        const now = new Date().toISOString();
        const updated: Plan = planSchema.parse({
          ...plan,
          status: 'Rejected',
          lastModified: now,
          audit: [
            ...plan.audit,
            { id: createId('audit'), actor, action: 'rejected', comment, timestamp: now },
          ],
        });
        const nextRecord = planToRecord(updated, scope, record);
        await db.upsertPlan(scope, nextRecord);
        return recordToPlan(nextRecord);
      });
    },
    async revertPlan(id, actor, comment) {
      return withScope(async (scope) => {
        const record = await db.getPlan(scope, id);
        if (!record) return undefined;
        const plan = recordToPlan(record);
        const now = new Date().toISOString();
        const updated: Plan = planSchema.parse({
          ...plan,
          status: 'Draft',
          lastModified: now,
          audit: [
            ...plan.audit,
            { id: createId('audit'), actor, action: 'reverted', comment, timestamp: now },
          ],
        });
        const nextRecord = planToRecord(updated, scope, record);
        await db.upsertPlan(scope, nextRecord);
        return recordToPlan(nextRecord);
      });
    },
    async listAudit(id) {
      return withScope(async (scope) => {
        const record = await db.getPlan(scope, id);
        return record?.audit ?? [];
      });
    },
    async listCampaigns() {
      return withScope(async (scope) => {
        const plans = await db.listPlans(scope);
        const campaigns = plans.flatMap((plan) => plan.campaigns);
        const unique = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
        return Array.from(unique.values());
      });
    },
  };
}
