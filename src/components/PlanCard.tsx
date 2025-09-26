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
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{plan.meta.name}</h3>
          <p className="text-sm text-slate-500">
            {plan.meta.code} • v{plan.meta.version} • Status: {plan.status}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Updated {formatDate(plan.lastModified)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onOpen}>Open</Button>
        <Button variant="secondary" onClick={onReview}>
          Review
        </Button>
        <Button variant="ghost" onClick={onDuplicate}>
          Duplicate
        </Button>
      </div>
    </Card>
  );
}
