import { useNavigate } from 'react-router-dom';
import { usePlans, useCreatePlan, useDuplicatePlan } from '@/api/plans';
import { Button } from '@/ui/Button';
import { PlanList } from '@/components/PlanList';
import { useUser } from '@/auth/useUser';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: plans = [], isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const duplicatePlan = useDuplicatePlan();
  const { user } = useUser();

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
          <Button
            onClick={handleCreate}
            disabled={createPlan.isPending}
            className="self-start sm:self-auto"
          >
            New Plan
          </Button>
        </header>
        {isLoading ? <p className="text-sm text-slate-500">Loading plans...</p> : null}
        {!isLoading ? (
          <PlanList
            plans={plans}
            onOpen={(id) => navigate(`/plan/${id}`)}
            onReview={(id) => navigate(`/plan/${id}/review`)}
            onDuplicate={handleDuplicate}
          />
        ) : null}
      </section>
    </main>
  );
}
