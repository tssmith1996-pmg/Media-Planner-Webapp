import type { Plan } from '@/lib/schemas';
import { currencyFormatter, numberFormatter } from '@/lib/formatters';

export function GoalKPIBar({ plan }: { plan: Plan }) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Total Budget</p>
        <p className="text-xl font-semibold">{currencyFormatter.format(plan.goal.budget)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Reach</p>
        <p className="text-xl font-semibold">{numberFormatter.format(plan.goal.reach)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Frequency</p>
        <p className="text-xl font-semibold">{plan.goal.frequency.toFixed(1)}x</p>
      </div>
    </div>
  );
}
