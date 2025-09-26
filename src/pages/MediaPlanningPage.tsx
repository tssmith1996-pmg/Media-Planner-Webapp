import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  usePlan,
  useMutatePlan,
  useSubmitPlan,
  useApprovePlan,
  useRejectPlan,
  useRevertPlan,
  useDuplicatePlan,
} from '@/api/plans';
import { GoalKPIBar } from '@/components/GoalKPIBar';
import { ChannelTable } from '@/components/ChannelTable';
import { BudgetAllocator } from '@/components/BudgetAllocator';
import { SummarySidebar } from '@/components/SummarySidebar';
import { PacingWarnings } from '@/components/PacingWarnings';
import { PlanTitleBar } from '@/components/PlanTitleBar';
import { AuditDrawer } from '@/components/AuditDrawer';
import { ExportDialog } from '@/components/ExportDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/ui/Button';
import { useUser } from '@/auth/useUser';

export function MediaPlanningPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { data: plan, isLoading } = usePlan(params.id);
  const mutatePlan = useMutatePlan();
  const submitPlan = useSubmitPlan();
  const approvePlan = useApprovePlan();
  const rejectPlan = useRejectPlan();
  const revertPlan = useRevertPlan();
  const duplicatePlan = useDuplicatePlan();
  const { user } = useUser();

  const [exportOpen, setExportOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const editingDisabled = plan?.status !== 'Draft';

  const pageTitle = useMemo(() => plan?.meta.name ?? 'Plan', [plan?.meta.name]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading plan...</p>;
  }

  if (!plan) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-rose-600">Plan not found.</p>
        <Button variant="secondary" onClick={() => navigate('/')}>Back to dashboard</Button>
      </div>
    );
  }

  const handleBudgetChange = (tacticId: string, budget: number) => {
    if (editingDisabled) return;
    const next = {
      ...plan,
      tactics: plan.tactics.map((tactic) => (tactic.id === tacticId ? { ...tactic, budget } : tactic)),
    };
    mutatePlan.mutate(next);
  };

  const handleSubmit = async () => {
    await submitPlan.mutateAsync({ id: plan.id, actor: user.name });
  };

  const handleApprove = async () => {
    await approvePlan.mutateAsync({ id: plan.id, actor: user.name });
  };

  const handleReject = async () => {
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectComment.trim()) return;
    await rejectPlan.mutateAsync({ id: plan.id, actor: user.name, comment: rejectComment });
    setRejectComment('');
    setRejectOpen(false);
  };

  const handleRevert = async () => {
    await revertPlan.mutateAsync({ id: plan.id, actor: user.name });
  };

  const handleDuplicate = async () => {
    const newPlan = await duplicatePlan.mutateAsync({ id: plan.id, actor: user.name });
    if (newPlan) {
      navigate(`/plan/${newPlan.id}`);
    }
  };

  return (
    <main className="container mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900">{pageTitle}</h1>
            <p className="text-sm text-slate-500 sm:max-w-2xl">
              Adjust channel budgets, track pacing, and share plans for approval.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setExportOpen(true)}
            className="self-start lg:self-auto"
          >
            Export Block Plan
          </Button>
        </header>
        <PlanTitleBar
          plan={plan}
          editingDisabled={Boolean(editingDisabled)}
          onSubmit={handleSubmit}
          onApprove={handleApprove}
          onReject={handleReject}
          onRevert={handleRevert}
          onDuplicate={handleDuplicate}
        />
        <GoalKPIBar plan={plan} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ChannelTable plan={plan} readOnly={editingDisabled} />
            <BudgetAllocator plan={plan} onBudgetChange={handleBudgetChange} readOnly={editingDisabled} />
            <PacingWarnings plan={plan} />
            <AuditDrawer events={plan.audit} />
          </div>
          <SummarySidebar plan={plan} />
        </div>
        <ExportDialog plan={plan} open={exportOpen} onClose={() => setExportOpen(false)} />
        <ConfirmDialog
          title="Reject Plan"
          description="Provide feedback for the planner."
          open={rejectOpen}
          destructive
          confirmText="Reject"
          onCancel={() => setRejectOpen(false)}
          onConfirm={confirmReject}
          body={
            <textarea
              className="mt-2 w-full rounded-md border border-slate-300 p-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
              value={rejectComment}
              onChange={(event) => setRejectComment(event.target.value)}
              placeholder="Share why the plan was rejected"
            />
          }
        />
      </div>
    </main>
  );
}
