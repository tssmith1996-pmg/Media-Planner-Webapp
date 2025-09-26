import { fakeServer } from './fakeServer';
import { Campaign, Plan } from './schemas';

const delay = async (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const queryKeys = {
  campaigns: (query: string | undefined) => ['campaigns', query ?? ''],
  plan: (planId: string) => ['plan', planId],
} as const;

/** Fetch campaigns optionally filtered by a search query. */
export const getCampaigns = async (query?: string): Promise<Campaign[]> => {
  await delay(120);
  return fakeServer.getCampaigns(query);
};

/** Retrieve a plan by its identifier. */
export const getPlan = async (planId: string): Promise<Plan> => {
  await delay(150);
  return fakeServer.getPlan(planId);
};

/** Persist the provided plan and return the saved instance. */
export const savePlan = async (plan: Plan): Promise<Plan> => {
  await delay(180);
  return fakeServer.savePlan(plan);
};

/** Submit a plan for approval. Editing becomes disabled once submitted. */
export const submitPlan = async (planId: string): Promise<{ status: 'Submitted' }> => {
  await delay(200);
  return fakeServer.submitPlan(planId);
};
