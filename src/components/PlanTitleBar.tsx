import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Plan } from '@/lib/schemas';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { useMutatePlan } from '@/api/plans';
import { useUser, canApprove } from '@/auth/useUser';

const metaSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
});

type MetaForm = z.infer<typeof metaSchema>;

export function PlanTitleBar({
  plan,
  editingDisabled,
  onSubmit,
  onApprove,
  onReject,
  onRevert,
  onDuplicate,
}: {
  plan: Plan;
  editingDisabled: boolean;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRevert: () => void;
  onDuplicate: () => void;
}) {
  const mutatePlan = useMutatePlan();
  const { user } = useUser();

  const form = useForm<MetaForm>({
    resolver: zodResolver(metaSchema),
    defaultValues: { name: plan.meta.name, code: plan.meta.code },
  });

  useEffect(() => {
    form.reset({ name: plan.meta.name, code: plan.meta.code });
  }, [plan.meta.name, plan.meta.code, form]);

  const submitMeta = form.handleSubmit(async (values) => {
    if (editingDisabled) return;
    const next: Plan = {
      ...plan,
      meta: { ...plan.meta, ...values },
    };
    await mutatePlan.mutateAsync(next);
  });

  const showSubmit = plan.status === 'Draft';
  const showApprove = plan.status === 'Submitted' && canApprove(user);
  const showReject = plan.status === 'Submitted' && canApprove(user);
  const showRevert = plan.status !== 'Draft' && plan.status !== 'Approved';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <form className="flex flex-wrap items-center gap-3" onSubmit={(event) => event.preventDefault()}>
              <Input
                {...form.register('name')}
                onBlur={() => submitMeta()}
                disabled={editingDisabled}
                className="w-64"
                aria-label="Plan name"
              />
              <Input
                {...form.register('code')}
                onBlur={() => submitMeta()}
                disabled={editingDisabled}
                className="w-40"
                aria-label="Plan code"
              />
            </form>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
              v{plan.meta.version}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {plan.status}
            </span>
          </div>
          <p className="text-xs text-slate-500">Autosaves instantly. Last modified {new Date(plan.lastModified).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onDuplicate}>
            Duplicate
          </Button>
          {showRevert ? (
            <Button variant="secondary" onClick={onRevert}>
              Revert to Draft
            </Button>
          ) : null}
          {showReject ? (
            <Button variant="danger" onClick={onReject}>
              Reject
            </Button>
          ) : null}
          {showApprove ? (
            <Button variant="primary" onClick={onApprove}>
              Approve
            </Button>
          ) : null}
          {showSubmit ? (
            <Button variant="primary" onClick={onSubmit}>
              Submit for Approval
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
