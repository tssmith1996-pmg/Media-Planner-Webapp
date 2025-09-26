import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlan, useApprovePlan, useRejectPlan, useRevertPlan } from '@/api/plans';
import { GoalKPIBar } from '@/components/GoalKPIBar';
import { ChannelTable } from '@/components/ChannelTable';
import { SummarySidebar } from '@/components/SummarySidebar';
import { PacingWarnings } from '@/components/PacingWarnings';
import { AuditDrawer } from '@/components/AuditDrawer';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/ui/Button';
import { useUser, canApprove } from '@/auth/useUser';

export function PlanDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { data: plan, isLoading } = usePlan(params.id);
  const approvePlan = useApprovePlan();
  const rejectPlan = useRejectPlan();
  const revertPlan = useRevertPlan();
  const { user } = useUser();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

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

  const handleApprove = async () => {
    await approvePlan.mutateAsync({ id: plan.id, actor: user.name });
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) return;
    await rejectPlan.mutateAsync({ id: plan.id, actor: user.name, comment: rejectComment });
    setRejectComment('');
    setRejectOpen(false);
  };

  const handleRevert = async () => {
    await revertPlan.mutateAsync({ id: plan.id, actor: user.name });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">{plan.meta.name}</h2>
        <Button variant="secondary" onClick={() => navigate(`/plan/${plan.id}`)}>
          Open Editor
        </Button>
      </div>
      <GoalKPIBar plan={plan} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <ChannelTable plan={plan} readOnly />
          <PacingWarnings plan={plan} />
          <AuditDrawer events={plan.audit} />
        </div>
        <SummarySidebar plan={plan} />
      </div>
      {canApprove(user) ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={handleApprove}>
            Approve
          </Button>
          <Button variant="danger" onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
          {plan.status === 'Rejected' ? (
            <Button variant="secondary" onClick={handleRevert}>
              Revert to Draft
            </Button>
          ) : null}
        </div>
      ) : null}
      <ConfirmDialog
        title="Reject Plan"
        description="Provide feedback for the planner."
        open={rejectOpen}
        destructive
        confirmText="Reject"
        onCancel={() => setRejectOpen(false)}
        onConfirm={handleReject}
        body={
          <textarea
            className="mt-2 w-full rounded-md border border-slate-300 p-2 text-sm"
            rows={4}
            value={rejectComment}
            onChange={(event) => setRejectComment(event.target.value)}
            placeholder="Share why the plan was rejected"
          />
        }
      />
    </div>
  );
}
