import type { Plan } from '@/lib/schemas';
import { calculatePlanTotals } from '@/lib/math';
import { currencyFormatter, percentFormatter } from '@/lib/formatters';

export function SummarySidebar({ plan }: { plan: Plan }) {
  const totals = calculatePlanTotals(plan);

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Plan Summary</h3>
        <p className="text-xs text-slate-500">Snapshot of spend and mix.</p>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Total Budget</span>
          <span className="font-semibold">{currencyFormatter.format(totals.totalBudget)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Impressions</span>
          <span className="font-semibold">{currencyFormatter.format(totals.totalImpressions).replace('$', '')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Blended CPM</span>
          <span className="font-semibold">{currencyFormatter.format(totals.cpm)}</span>
        </div>
      </div>
      <div>
        <h4 className="text-xs uppercase tracking-wide text-slate-500">Channel Mix</h4>
        <ul className="mt-2 space-y-1 text-sm">
          {totals.channels.map((channel) => {
            const share = totals.totalBudget === 0 ? 0 : channel.budget / totals.totalBudget;
            return (
              <li key={channel.channel} className="flex items-center justify-between">
                <span>{channel.channel}</span>
                <span>
                  {currencyFormatter.format(channel.budget)} • {percentFormatter.format(share)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
