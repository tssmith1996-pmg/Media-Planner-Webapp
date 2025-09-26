/**
 * Media Planning Page demo instructions:
 * 1. Install dependencies with `npm install`.
 * 2. Start the dev server via `npm run dev`.
 * 3. Open http://localhost:5173 to explore the interactive media planning workspace.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PlanEditor from '../components/PlanEditor';
import { getCampaigns, getPlan, queryKeys, savePlan, submitPlan } from '../lib/api';
import type { Plan } from '../lib/schemas';

const DEFAULT_PLAN_ID = 'plan_au_q4';

const MediaPlanningPage = (): JSX.Element => {
  const [planId] = useState(DEFAULT_PLAN_ID);
  const queryClient = useQueryClient();

  const campaignsQuery = useQuery({
    queryKey: queryKeys.campaigns(''),
    queryFn: () => getCampaigns(),
  });

  const planQuery = useQuery({
    queryKey: queryKeys.plan(planId),
    queryFn: () => getPlan(planId),
  });

  const saveMutation = useMutation({
    mutationFn: savePlan,
    onSuccess: (savedPlan) => {
      queryClient.setQueryData(queryKeys.plan(savedPlan.id), savedPlan);
    },
  });

  const revertMutation = useMutation({
    mutationFn: savePlan,
    onSuccess: (savedPlan) => {
      queryClient.setQueryData(queryKeys.plan(savedPlan.id), savedPlan);
    },
  });

  const submitMutation = useMutation({
    mutationFn: submitPlan,
    onSuccess: (_, submittedPlanId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plan(submittedPlanId) });
    },
  });

  const handleSaveDraft = async (draft: Plan) => {
    await saveMutation.mutateAsync(draft);
    queryClient.invalidateQueries({ queryKey: queryKeys.plan(draft.id) });
  };

  const handleRevert = async (draft: Plan) => {
    await revertMutation.mutateAsync(draft);
    queryClient.invalidateQueries({ queryKey: queryKeys.plan(draft.id) });
  };

  const handleSubmit = async (id: string) => {
    await submitMutation.mutateAsync(id);
  };

  const isLoading = campaignsQuery.isLoading || planQuery.isLoading;
  const hasError = campaignsQuery.isError || planQuery.isError;

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      {isLoading && (
        <div className="mx-auto max-w-6xl animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-slate-200" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="h-96 rounded-lg bg-slate-200" />
              <div className="h-48 rounded-lg bg-slate-200" />
            </div>
            <div className="h-full rounded-lg bg-slate-200" />
          </div>
        </div>
      )}

      {hasError && !isLoading && (
        <div className="mx-auto max-w-xl rounded border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <h2 className="text-lg font-semibold">Unable to load planning workspace</h2>
          <p className="mt-2 text-sm">
            Please refresh the page. If the issue persists, clear local storage to reset the mock data.
          </p>
        </div>
      )}

      {!isLoading && !hasError && planQuery.data && campaignsQuery.data && (
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold text-slate-900">Media planning workspace</h1>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('media-planning:open-export'))}
              className="inline-flex items-center justify-center rounded border border-blue-500 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Export block plan
            </button>
          </div>
          <PlanEditor
            plan={planQuery.data}
            campaigns={campaignsQuery.data}
            onSave={handleSaveDraft}
            onSubmit={handleSubmit}
            onRevert={handleRevert}
            isSaving={saveMutation.isPending || revertMutation.isPending}
            isSubmitting={submitMutation.isPending}
          />
        </div>
      )}
    </main>
  );
};

export default MediaPlanningPage;
