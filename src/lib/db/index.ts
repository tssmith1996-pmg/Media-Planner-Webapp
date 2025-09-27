import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { getFirebaseServices } from '../firebase';
import { createId } from '../id';
import { createConverter } from './converters';
import {
  alertSchema,
  auditLogSchema,
  connectionSchema,
  dashboardSchema,
  insertionOrderSchema,
  planSchema,
  planVersionSchema,
  reportSchema,
  syncRunSchema,
  tacticSchema,
  taskSchema,
  thresholdSchema,
  userSchema,
  workspaceSchema,
  type Alert,
  type AuditLog,
  type Connection,
  type Dashboard,
  type InsertionOrder,
  type PlanRecord,
  type PlanVersion,
  type Report,
  type SyncRun,
  type TacticRecord,
  type Task,
  type KpiThreshold,
  type AppUser,
  type Workspace,
} from './schemas';

export type ScopedContext = {
  user: AppUser;
  orgId: string;
  workspaceId?: string;
};

type Role = 'admin' | 'planner' | 'analyst' | 'partner';

function ensureRole(user: AppUser, scope: ScopedContext, allowed: Role[]) {
  const role = user.orgRoles[scope.orgId];
  if (!role || !allowed.includes(role as Role)) {
    throw new Error('User lacks required organization role.');
  }
}

function ensureWorkspaceRole(user: AppUser, scope: ScopedContext, allowed: Role[]) {
  if (!scope.workspaceId) return;
  const role = user.workspaceRoles[scope.workspaceId];
  if (!role || !allowed.includes(role as Role)) {
    throw new Error('User lacks required workspace role.');
  }
}

export async function withOrgScope<T>(scope: ScopedContext, callback: (ctx: ScopedContext) => Promise<T>) {
  const { firestore } = getFirebaseServices();
  const workspaceId = scope.workspaceId;
  if (workspaceId) {
    const workspaceDoc = await getDoc(
      doc(firestore, 'workspaces', workspaceId).withConverter(createConverter(workspaceSchema)),
    );
    const workspace = workspaceDoc.data();
    if (!workspace || workspace.orgId !== scope.orgId) {
      throw new Error('Workspace does not belong to organization.');
    }
  }
  ensureRole(scope.user, scope, ['admin', 'planner', 'analyst', 'partner']);
  return callback(scope);
}

const planConverter = createConverter(planSchema);
const planVersionConverter = createConverter(planVersionSchema);
const tacticConverter = createConverter(tacticSchema);
const ioConverter = createConverter(insertionOrderSchema);
const connectionConverter = createConverter(connectionSchema);
const syncRunConverter = createConverter(syncRunSchema);
const thresholdConverter = createConverter(thresholdSchema);
const alertConverter = createConverter(alertSchema);
const dashboardConverter = createConverter(dashboardSchema);
const reportConverter = createConverter(reportSchema);
const taskConverter = createConverter(taskSchema);
const auditConverter = createConverter(auditLogSchema);
const workspaceConverter = createConverter(workspaceSchema);
const userConverter = createConverter(userSchema);

function isoNow() {
  return new Date().toISOString();
}

function requireWorkspace(scope: ScopedContext): string {
  const workspaceId = scope.workspaceId;
  if (!workspaceId) {
    throw new Error('Workspace context is required for this operation.');
  }
  return workspaceId;
}

export const db = {
  async ensureWorkspace(scope: ScopedContext): Promise<Workspace> {
    const { firestore } = getFirebaseServices();
    const workspaceDoc = doc(firestore, 'workspaces', scope.workspaceId ?? '');
    const snapshot = await getDoc(workspaceDoc.withConverter(workspaceConverter));
    if (!snapshot.exists()) {
      throw new Error('Workspace not found.');
    }
    ensureRole(scope.user, scope, ['admin', 'planner', 'analyst', 'partner']);
    return snapshot.data();
  },
  async listPlans(scope: ScopedContext): Promise<PlanRecord[]> {
    const { firestore } = getFirebaseServices();
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    const workspaceId = requireWorkspace(scope);
    const plansQuery = query(
      collection(firestore, 'plans').withConverter(planConverter),
      where('workspaceId', '==', workspaceId),
    );
    const snapshot = await getDocs(plansQuery);
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
  async getPlan(scope: ScopedContext, planId: string): Promise<PlanRecord | undefined> {
    const { firestore } = getFirebaseServices();
    const planDoc = await getDoc(doc(firestore, 'plans', planId).withConverter(planConverter));
    const plan = planDoc.data();
    if (!plan) return undefined;
    const workspaceId = requireWorkspace(scope);
    if (plan.workspaceId !== workspaceId) {
      throw new Error('Plan does not belong to workspace.');
    }
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    return plan;
  },
  async upsertPlan(scope: ScopedContext, record: PlanRecord): Promise<void> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner']);
    const now = isoNow();
    const data = {
      ...record,
      workspaceId,
      campaigns: record.campaigns ?? [],
      flights: record.flights ?? [],
      audiences: record.audiences ?? [],
      vendors: record.vendors ?? [],
      creatives: record.creatives ?? [],
      lineItems: record.lineItems ?? [],
      tracking: record.tracking ?? [],
      deliveryActuals: record.deliveryActuals ?? [],
      audit: record.audit ?? [],
      lastModified: record.lastModified ?? now,
      updatedAt: now,
      updatedBy: scope.user.id,
    } satisfies PlanRecord;
    await setDoc(doc(firestore, 'plans', record.id).withConverter(planConverter), data);
    await addDoc(collection(firestore, 'planVersions').withConverter(planVersionConverter), {
      id: createId('planVersion'),
      planId: record.id,
      workspaceId,
      version: record.version,
      diff: {},
      createdAt: now,
      createdBy: scope.user.id,
    } satisfies PlanVersion);
    await addDoc(collection(firestore, 'auditLogs').withConverter(auditConverter), {
      id: createId('audit'),
      actorId: scope.user.id,
      action: 'plan.updated',
      entity: 'plan',
      entityId: record.id,
      meta: { version: record.version },
      at: now,
      orgId: scope.orgId,
      workspaceId,
    } satisfies AuditLog);
  },
  async createPlan(scope: ScopedContext, input: PlanRecord): Promise<PlanRecord> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner']);
    const now = isoNow();
    const plan: PlanRecord = {
      ...input,
      id: input.id ?? createId('plan'),
      workspaceId,
      campaigns: input.campaigns ?? [],
      flights: input.flights ?? [],
      audiences: input.audiences ?? [],
      vendors: input.vendors ?? [],
      creatives: input.creatives ?? [],
      lineItems: input.lineItems ?? [],
      tracking: input.tracking ?? [],
      deliveryActuals: input.deliveryActuals ?? [],
      audit: input.audit ?? [],
      version: input.version ?? 1,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
      lastModified: input.lastModified ?? now,
      createdBy: input.createdBy ?? scope.user.id,
      updatedBy: scope.user.id,
      status: input.status ?? 'Draft',
      meta: input.meta ?? {
        name: input.name ?? 'Plan',
        code: createId('plan').slice(0, 8),
        version: input.version ?? 1,
      },
      goal: input.goal ?? { budget: 0, reach: 0, frequency: 0 },
      owner: input.owner ?? scope.user.id,
      ownerId: input.ownerId ?? scope.user.id,
      timeframe:
        input.timeframe ?? {
          start: now,
          end: now,
        },
      currency: input.currency ?? 'USD',
      state: input.state ?? 'draft',
    };
    await setDoc(doc(firestore, 'plans', plan.id).withConverter(planConverter), plan);
    await addDoc(collection(firestore, 'planVersions').withConverter(planVersionConverter), {
      id: createId('planVersion'),
      planId: plan.id,
      workspaceId,
      version: plan.version,
      diff: {},
      createdAt: now,
      createdBy: scope.user.id,
    } satisfies PlanVersion);
    await addDoc(collection(firestore, 'auditLogs').withConverter(auditConverter), {
      id: createId('audit'),
      actorId: scope.user.id,
      action: 'plan.created',
      entity: 'plan',
      entityId: plan.id,
      meta: {},
      at: now,
      orgId: scope.orgId,
      workspaceId,
    } satisfies AuditLog);
    return plan;
  },
  async listInsertionOrders(scope: ScopedContext, planId: string): Promise<InsertionOrder[]> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    const snapshot = await getDocs(
      query(
        collection(firestore, 'insertionOrders').withConverter(ioConverter),
        where('planId', '==', planId),
        where('workspaceId', '==', workspaceId),
      ),
    );
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
  async createInsertionOrder(
    scope: ScopedContext,
    planId: string,
    input: Omit<InsertionOrder, 'id' | 'createdAt' | 'workspaceId'>,
  ): Promise<InsertionOrder> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner']);
    const order: InsertionOrder = {
      ...input,
      id: createId('io'),
      planId,
      workspaceId,
      createdAt: isoNow(),
    };
    await setDoc(doc(firestore, 'insertionOrders', order.id).withConverter(ioConverter), order);
    await addDoc(collection(firestore, 'auditLogs').withConverter(auditConverter), {
      id: createId('audit'),
      actorId: scope.user.id,
      action: 'io.created',
      entity: 'insertionOrder',
      entityId: order.id,
      meta: { planId },
      at: order.createdAt,
      orgId: scope.orgId,
      workspaceId,
    } satisfies AuditLog);
    return order;
  },
  async updateInsertionOrder(scope: ScopedContext, order: InsertionOrder): Promise<void> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner']);
    await setDoc(doc(firestore, 'insertionOrders', order.id).withConverter(ioConverter), {
      ...order,
      workspaceId,
    });
  },
  async listTactics(scope: ScopedContext, planId: string): Promise<TacticRecord[]> {
    const { firestore } = getFirebaseServices();
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    const snapshot = await getDocs(
      query(collection(firestore, 'tactics').withConverter(tacticConverter), where('planId', '==', planId)),
    );
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
  async saveTactic(scope: ScopedContext, tactic: TacticRecord): Promise<void> {
    const { firestore } = getFirebaseServices();
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner']);
    await setDoc(doc(firestore, 'tactics', tactic.id).withConverter(tacticConverter), {
      ...tactic,
      workspaceId: scope.workspaceId,
      planId: tactic.planId,
      updatedAt: isoNow(),
    });
  },
  async log(scope: ScopedContext, entry: AuditLog): Promise<void> {
    const { firestore } = getFirebaseServices();
    ensureRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    await setDoc(doc(firestore, 'auditLogs', entry.id).withConverter(auditConverter), entry);
  },
  async listAuditLogs(scope: ScopedContext, entity: string, entityId: string): Promise<AuditLog[]> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    const snapshot = await getDocs(
      query(
        collection(firestore, 'auditLogs').withConverter(auditConverter),
        where('workspaceId', '==', workspaceId),
        where('entity', '==', entity),
        where('entityId', '==', entityId),
      ),
    );
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
  async listConnections(scope: ScopedContext): Promise<Connection[]> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    const snapshot = await getDocs(
      query(collection(firestore, 'connections').withConverter(connectionConverter), where('workspaceId', '==', workspaceId)),
    );
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
  async saveConnection(scope: ScopedContext, connection: Connection): Promise<void> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin']);
    await setDoc(doc(firestore, 'connections', connection.id).withConverter(connectionConverter), {
      ...connection,
      workspaceId,
      updatedAt: isoNow(),
    });
  },
  async listThresholds(scope: ScopedContext): Promise<KpiThreshold[]> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    const snapshot = await getDocs(
      query(collection(firestore, 'kpiThresholds').withConverter(thresholdConverter), where('workspaceId', '==', workspaceId)),
    );
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
  async saveThreshold(scope: ScopedContext, threshold: KpiThreshold): Promise<void> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner']);
    await setDoc(doc(firestore, 'kpiThresholds', threshold.id).withConverter(thresholdConverter), {
      ...threshold,
      workspaceId,
    });
  },
  async createTask(scope: ScopedContext, task: Task): Promise<void> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner']);
    await setDoc(doc(firestore, 'tasks', task.id).withConverter(taskConverter), {
      ...task,
      workspaceId,
    });
  },
  async listTasks(scope: ScopedContext): Promise<Task[]> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst', 'partner']);
    const snapshot = await getDocs(
      query(collection(firestore, 'tasks').withConverter(taskConverter), where('workspaceId', '==', workspaceId)),
    );
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
  async listDashboards(scope: ScopedContext): Promise<Dashboard[]> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst', 'partner']);
    const snapshot = await getDocs(
      query(
        collection(firestore, 'dashboards').withConverter(dashboardConverter),
        where('workspaceId', '==', workspaceId),
      ),
    );
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
  async saveReport(scope: ScopedContext, report: Report): Promise<void> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner']);
    await setDoc(doc(firestore, 'reports', report.id).withConverter(reportConverter), {
      ...report,
      workspaceId,
    });
  },
  async listReports(scope: ScopedContext): Promise<Report[]> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst', 'partner']);
    const snapshot = await getDocs(
      query(collection(firestore, 'reports').withConverter(reportConverter), where('workspaceId', '==', workspaceId)),
    );
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
  async recordSyncRun(scope: ScopedContext, run: SyncRun): Promise<void> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    await setDoc(doc(firestore, 'syncRuns', run.id).withConverter(syncRunConverter), {
      ...run,
      workspaceId,
    });
  },
  async listAlerts(scope: ScopedContext): Promise<Alert[]> {
    const { firestore } = getFirebaseServices();
    const workspaceId = requireWorkspace(scope);
    ensureWorkspaceRole(scope.user, scope, ['admin', 'planner', 'analyst']);
    const snapshot = await getDocs(
      query(collection(firestore, 'alerts').withConverter(alertConverter), where('workspaceId', '==', workspaceId)),
    );
    return snapshot.docs.map((docSnapshot) => docSnapshot.data());
  },
};

export async function ensureUserRecord(user: AppUser) {
  const { firestore } = getFirebaseServices();
  await setDoc(doc(firestore, 'users', user.id).withConverter(userConverter), {
    ...user,
    createdAt: user.createdAt ?? isoNow(),
    updatedAt: user.updatedAt ?? isoNow(),
  });
}
