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

  const nameId = `plan-name-${plan.id}`;
  const codeId = `plan-code-${plan.id}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex w-full flex-col gap-4 lg:max-w-xl">
          <form
            className="grid w-full gap-4 sm:grid-cols-3 sm:items-end"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor={nameId} className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Plan name
              </label>
              <Input
                {...form.register('name')}
                id={nameId}
                onBlur={() => submitMeta()}
                disabled={editingDisabled}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={codeId} className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Plan code
              </label>
              <Input
                {...form.register('code')}
                id={codeId}
                onBlur={() => submitMeta()}
                disabled={editingDisabled}
                className="w-full"
              />
            </div>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
              v{plan.meta.version}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{plan.status}</span>
            <span className="text-slate-400">Last modified {new Date(plan.lastModified).toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-500">Autosaves instantly after each change.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto">
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
    </section>
  );
}
