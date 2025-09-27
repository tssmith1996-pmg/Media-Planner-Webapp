import { ChangeEvent } from 'react';
import type { Plan } from '@/lib/schemas';
import { Input } from '@/ui/Input';
import { currencyFormatter } from '@/lib/formatters';

export function BudgetAllocator({
  plan,
  onBudgetChange,
  readOnly,
}: {
  plan: Plan;
  onBudgetChange: (lineItemId: string, budget: number) => void;
  readOnly?: boolean;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>, id: string) => {
    const next = Number.parseFloat(event.target.value);
    if (Number.isFinite(next)) {
      onBudgetChange(id, next);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Budget Allocations</h3>
        <p className="text-xs text-slate-500">Adjust to see updated totals.</p>
      </div>
      <div className="space-y-3">
        {plan.lineItems.map((lineItem) => {
          const label = plan.creatives.find((item) => item.creative_id === lineItem.creative_id)?.ad_name;
          return (
            <div key={lineItem.line_item_id} className="flex flex-wrap items-center gap-3">
              <div className="w-48 text-sm font-medium text-slate-700">{label ?? lineItem.line_item_id}</div>
              <Input
                key={`${lineItem.line_item_id}-${lineItem.cost_planned}`}
                type="number"
              step={1000}
              min={0}
              defaultValue={lineItem.cost_planned}
              disabled={readOnly}
              onBlur={(event) => handleChange(event, lineItem.line_item_id)}
              className="w-32"
              aria-label={`${label ?? lineItem.line_item_id} planned cost`}
            />
              <span className="text-xs text-slate-500">
                Current: {currencyFormatter.format(lineItem.cost_planned)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
