import { seedData } from '@/data/seed';
import {
  approvalEventSchema,
  createDraftPlan,
  planSchema,
  type Plan,
} from '@/lib/schemas';
import { createId } from '@/lib/id';
import type { Store } from './types';

const STORAGE_KEY = 'media-planner-store';

const memory = new Map<string, string>();

const storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> =
  typeof window === 'undefined'
    ? {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      }
    : window.localStorage;

type StorePayload = {
  plans: Plan[];
};

function load(): StorePayload {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    const payload: StorePayload = {
      plans: seedData.plans,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return JSON.parse(JSON.stringify(payload));
  }
  try {
    const parsed = JSON.parse(raw) as StorePayload;
    return {
      plans: parsed.plans.map((plan) => planSchema.parse(plan)),
    };
  } catch (error) {
    console.error('Failed to parse local storage payload, resetting', error);
    storage.removeItem(STORAGE_KEY);
    return load();
  }
}

function persist(payload: StorePayload) {
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clonePlan(plan: Plan): Plan {
  return planSchema.parse(JSON.parse(JSON.stringify(plan)));
}

function touch(plan: Plan): Plan {
  return { ...plan, lastModified: new Date().toISOString() };
}

const statusToAction: Record<string, 'created' | 'edited' | 'submitted' | 'approved' | 'rejected' | 'reverted' | 'duplicated'> = {
  Draft: 'reverted',
  Submitted: 'submitted',
  Approved: 'approved',
  Rejected: 'rejected',
  Archived: 'edited',
  created: 'created',
  edited: 'edited',
  duplicated: 'duplicated',
};

function appendAudit(plan: Plan, actor: string, action: keyof typeof statusToAction, comment?: string) {
  const entry = approvalEventSchema.parse({
    id: createId('audit'),
    actor,
    action: statusToAction[action],
    comment,
    timestamp: new Date().toISOString(),
  });
  return { ...plan, audit: [...plan.audit, entry] };
}

export function LocalAdapter(): Store {
  let state = load();

  const saveState = () => persist(state);

  return {
    async listPlans() {
      state = load();
      return state.plans.map((plan) => clonePlan(plan));
    },
    async getPlan(id) {
      state = load();
      const plan = state.plans.find((item) => item.id === id);
      return plan ? clonePlan(plan) : undefined;
    },
    async savePlan(plan) {
      const next = touch(plan);
      state.plans = state.plans.map((item) => (item.id === next.id ? clonePlan(next) : item));
      saveState();
      return clonePlan(next);
    },
    async createPlan(base) {
      const plan = createDraftPlan(base);
      state.plans.push(plan);
      saveState();
      return clonePlan(plan);
    },
    async duplicatePlan(id, actor) {
      const original = state.plans.find((plan) => plan.id === id);
      if (!original) return undefined;
      const now = new Date().toISOString();
      const duplicated: Plan = {
        ...clonePlan(original),
        id: createId('plan'),
        meta: {
          ...original.meta,
          version: original.meta.version + 1,
          name: `${original.meta.name} (Copy)`,
        },
        status: 'Draft',
        lastModified: now,
        audit: [
          ...original.audit,
          {
            id: createId('audit'),
            actor,
            action: 'duplicated',
            timestamp: now,
          },
        ],
      };
      state.plans.push(duplicated);
      saveState();
      return clonePlan(duplicated);
    },
    async submitPlan(id, actor, comment) {
      const plan = state.plans.find((item) => item.id === id);
      if (!plan) return undefined;
      const next: Plan = {
        ...plan,
        status: 'Submitted',
      };
      const audited = appendAudit(touch(next), actor, 'Submitted', comment);
      state.plans = state.plans.map((item) => (item.id === id ? audited : item));
      saveState();
      return clonePlan(audited);
    },
    async approvePlan(id, actor, comment) {
      const plan = state.plans.find((item) => item.id === id);
      if (!plan) return undefined;
      const next: Plan = {
        ...plan,
        status: 'Approved',
        approver: actor,
      };
      const audited = appendAudit(touch(next), actor, 'Approved', comment);
      state.plans = state.plans.map((item) => (item.id === id ? audited : item));
      saveState();
      return clonePlan(audited);
    },
    async rejectPlan(id, actor, comment) {
      const plan = state.plans.find((item) => item.id === id);
      if (!plan) return undefined;
      const next: Plan = {
        ...plan,
        status: 'Rejected',
      };
      const audited = appendAudit(touch(next), actor, 'Rejected', comment);
      state.plans = state.plans.map((item) => (item.id === id ? audited : item));
      saveState();
      return clonePlan(audited);
    },
    async revertPlan(id, actor, comment) {
      const plan = state.plans.find((item) => item.id === id);
      if (!plan) return undefined;
      const next: Plan = {
        ...plan,
        status: 'Draft',
      };
      const audited = appendAudit(touch(next), actor, 'Draft', comment);
      state.plans = state.plans.map((item) => (item.id === id ? audited : item));
      saveState();
      return clonePlan(audited);
    },
    async listAudit(id) {
      const plan = state.plans.find((item) => item.id === id);
      return plan ? plan.audit.map((event) => ({ ...event })) : [];
    },
    async listCampaigns() {
      const plans = await this.listPlans();
      const campaigns = plans.flatMap((plan) => plan.campaigns);
      const unique = new Map(campaigns.map((item) => [item.id, item]));
      return Array.from(unique.values()).map((campaign) => ({ ...campaign }));
    },
  };
}
