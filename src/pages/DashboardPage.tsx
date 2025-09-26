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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Plans</h2>
          <p className="text-sm text-slate-500">Manage media plans, versions, and approvals.</p>
        </div>
        <Button onClick={handleCreate} disabled={createPlan.isPending}>
          New Plan
        </Button>
      </div>
      {isLoading ? <p className="text-sm text-slate-500">Loading plans...</p> : null}
      {!isLoading ? (
        <PlanList
          plans={plans}
          onOpen={(id) => navigate(`/plan/${id}`)}
          onReview={(id) => navigate(`/plan/${id}/review`)}
          onDuplicate={handleDuplicate}
        />
      ) : null}
    </div>
  );
}
