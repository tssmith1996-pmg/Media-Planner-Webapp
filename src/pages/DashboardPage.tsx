import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlans, useCreatePlan, useDuplicatePlan } from '@/api/plans';
import { Button } from '@/ui/Button';
import { PlanList, type PlanListView } from '@/components/PlanList';
import { useUser } from '@/auth/useUser';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: plans = [], isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const duplicatePlan = useDuplicatePlan();
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<PlanListView>('grid');

  const handleCreate = async () => {
    const plan = await createPlan.mutateAsync();
    navigate(`/plan/${plan.id}`);
  };

  const handleDuplicate = async (id: string) => {
    await duplicatePlan.mutateAsync({ id, actor: user.name });
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <section className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900">Plans</h1>
            <p className="text-sm text-slate-500 sm:max-w-xl">
              Manage media plans, versions, and approvals from one place.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-md border border-slate-200 bg-white p-1 text-xs font-medium text-slate-600 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded px-3 py-1 transition ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
              >
                Card view
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded px-3 py-1 transition ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
              >
                List view
              </button>
            </div>
            <Button
              onClick={handleCreate}
              disabled={createPlan.isPending}
              className="self-start sm:self-auto"
            >
              New Plan
            </Button>
          </div>
        </header>
        {isLoading ? <p className="text-sm text-slate-500">Loading plans...</p> : null}
        {!isLoading ? (
          <PlanList
            plans={plans}
            viewMode={viewMode}
            onOpen={(id) => navigate(`/plan/${id}`)}
            onReview={(id) => navigate(`/plan/${id}/review`)}
            onDuplicate={handleDuplicate}
          />
        ) : null}
      </section>
    </main>
  );
}
