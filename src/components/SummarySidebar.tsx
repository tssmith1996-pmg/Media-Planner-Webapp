import type { Plan } from '@/lib/schemas';
import { calculatePlanTotals } from '@/lib/math';
import { currencyFormatter, numberFormatter, percentFormatter } from '@/lib/formatters';

export function SummarySidebar({ plan }: { plan: Plan }) {
  const totals = calculatePlanTotals(plan);

  return (
    <aside className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">Plan Summary</h2>
        <p className="text-sm text-slate-500">Snapshot of spend, pace, and channel mix.</p>
      </div>
      <dl className="space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-slate-500">Total Budget</dt>
          <dd className="text-right font-semibold text-slate-900">
            {currencyFormatter.format(totals.totalBudget)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-slate-500">Units Planned</dt>
          <dd className="text-right font-semibold text-slate-900">
            {numberFormatter.format(totals.totalUnits)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-slate-500">Blended Rate</dt>
          <dd className="text-right font-semibold text-slate-900">
            {currencyFormatter.format(totals.blendedRate)}
          </dd>
        </div>
      </dl>
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Channel Mix</h3>
        <ul className="space-y-2 text-sm">
          {totals.channels.map((channel) => {
            const share = totals.totalBudget === 0 ? 0 : channel.budget / totals.totalBudget;
            return (
              <li key={channel.channel} className="flex items-center justify-between gap-4">
                <span className="text-slate-600">{channel.channel}</span>
                <span className="text-right font-medium text-slate-900">
                  {currencyFormatter.format(channel.budget)}
                  <span className="ml-2 text-xs font-medium text-slate-500">
                    {percentFormatter.format(share)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
