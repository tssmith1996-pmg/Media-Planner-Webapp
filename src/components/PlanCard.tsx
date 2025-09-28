import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import type { Plan } from '@/lib/schemas';
import { formatDate, formatDateRange } from '@/lib/date';
import { currencyFormatter } from '@/lib/formatters';

function getDateRange(plan: Plan) {
  if (plan.flights.length === 0) return 'Set flight dates to reveal the schedule';
  const starts = plan.flights.map((flight) => flight.start_date);
  const ends = plan.flights.map((flight) => flight.end_date);
  const minStart = starts.reduce((min, current) => (current < min ? current : min), starts[0]);
  const maxEnd = ends.reduce((max, current) => (current > max ? current : max), ends[0]);
  return formatDateRange(minStart, maxEnd);
}

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
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {plan.meta.client}
            </span>
            <h3 className="text-xl font-semibold text-slate-900">{plan.meta.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
              v{plan.meta.version}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {plan.status}
            </span>
            <span className="text-slate-400">{plan.meta.code}</span>
          </div>
          <dl className="grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
            <div>
              <dt className="uppercase tracking-wide">Plan window</dt>
              <dd className="text-sm font-medium text-slate-800">{getDateRange(plan)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide">Working budget</dt>
              <dd className="text-sm font-medium text-slate-800">{currencyFormatter.format(plan.goal.budget)}</dd>
            </div>
          </dl>
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
