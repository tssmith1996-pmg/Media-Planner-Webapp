import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import type { Plan } from '@/lib/schemas';
import { formatDate } from '@/lib/date';

export function PlanCard({
  plan,
  onOpen,
  onReview,
  onDuplicate,
}: {
  plan: Plan;
  onOpen: () => void;
  onReview: () => void;
  onDuplicate: () => void;
}) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-900">{plan.meta.name}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
              v{plan.meta.version}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {plan.status}
            </span>
            <span className="text-slate-400">{plan.meta.code}</span>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
          Updated {formatDate(plan.lastModified)}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={onOpen} className="w-full sm:flex-1">
          Open
        </Button>
        <Button variant="secondary" onClick={onReview} className="w-full sm:flex-1">
          Review
        </Button>
        <Button variant="ghost" onClick={onDuplicate} className="w-full sm:w-auto">
          Duplicate
        </Button>
      </div>
    </Card>
  );
}
