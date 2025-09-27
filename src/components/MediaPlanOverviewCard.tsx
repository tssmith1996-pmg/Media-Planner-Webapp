import { useMemo } from 'react';
import type { Plan } from '@/lib/schemas';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { currencyFormatter } from '@/lib/formatters';
import { formatDate } from '@/lib/date';

type MediaPlanOverviewCardProps = {
  plan: Plan;
  onEdit?: () => void;
};

export function MediaPlanOverviewCard({ plan, onEdit }: MediaPlanOverviewCardProps) {
  const { totalCost, startDate, endDate } = useMemo(() => {
    const total = plan.lineItems.reduce((sum, item) => sum + item.cost_planned, 0);
    const starts = plan.flights.map((flight) => flight.start_date);
    const ends = plan.flights.map((flight) => flight.end_date);

    const start = starts.length > 0 ? starts.reduce((min, current) => (current < min ? current : min)) : null;
    const end = ends.length > 0 ? ends.reduce((max, current) => (current > max ? current : max)) : null;

    return { totalCost: total, startDate: start, endDate: end };
  }, [plan.flights, plan.lineItems]);

  return (
    <section aria-labelledby="plan-overview-heading">
      <Card className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Media Plan</p>
            <h1 id="plan-overview-heading" className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              {plan.meta.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">Client: {plan.meta.client}</p>
          </div>
          {onEdit ? (
            <Button variant="secondary" onClick={onEdit} aria-label="Edit plan">
              Edit plan
            </Button>
          ) : null}
        </header>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="font-medium text-slate-600">Plan code</dt>
            <dd className="mt-1 text-slate-900">{plan.meta.code}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Status</dt>
            <dd className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {plan.status}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Total cost</dt>
            <dd className="mt-1 text-slate-900">{currencyFormatter.format(totalCost)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Date range</dt>
            <dd className="mt-1 text-slate-900">
              {startDate && endDate ? `${formatDate(startDate)} – ${formatDate(endDate)}` : 'To be scheduled'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Owner</dt>
            <dd className="mt-1 text-slate-900">{plan.owner}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-600">Approver</dt>
            <dd className="mt-1 text-slate-900">{plan.approver ?? 'Unassigned'}</dd>
          </div>
        </dl>
      </Card>
    </section>
  );
}
