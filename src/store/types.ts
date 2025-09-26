import { ApprovalEvent, Campaign, Plan } from '@/lib/schemas';

export type Store = {
  listPlans: () => Promise<Plan[]>;
  getPlan: (id: string) => Promise<Plan | undefined>;
  savePlan: (plan: Plan) => Promise<Plan>;
  createPlan: (base?: Partial<Plan>) => Promise<Plan>;
  duplicatePlan: (id: string, actor: string) => Promise<Plan | undefined>;
  submitPlan: (id: string, actor: string, comment?: string) => Promise<Plan | undefined>;
  approvePlan: (id: string, actor: string, comment?: string) => Promise<Plan | undefined>;
  rejectPlan: (id: string, actor: string, comment: string) => Promise<Plan | undefined>;
  revertPlan: (id: string, actor: string, comment?: string) => Promise<Plan | undefined>;
  listAudit: (id: string) => Promise<ApprovalEvent[]>;
  listCampaigns: () => Promise<Campaign[]>;
};
