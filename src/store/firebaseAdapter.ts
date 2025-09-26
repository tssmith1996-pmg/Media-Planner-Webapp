import type { Store } from './types';

export function FirebaseAdapter(): Store {
  if (import.meta.env.MODE !== 'production') {
    console.warn('Firebase adapter invoked outside production. Falling back to in-memory stubs.');
  }

  const unsupported = async () => {
    throw new Error('Firebase adapter not configured. Provide Firebase credentials to enable persistent storage.');
  };

  return {
    listPlans: unsupported,
    getPlan: unsupported,
    savePlan: unsupported,
    createPlan: unsupported,
    duplicatePlan: unsupported,
    submitPlan: unsupported,
    approvePlan: unsupported,
    rejectPlan: unsupported,
    revertPlan: unsupported,
    listAudit: unsupported,
    listCampaigns: unsupported,
  };
}
