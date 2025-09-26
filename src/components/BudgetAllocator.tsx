import { useEffect, useMemo, useState } from 'react';
import { Plan, Tactic } from '../lib/schemas';

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const sumBudget = (tactics: Tactic[]) =>
  tactics.reduce((total, tactic) => total + (Number.isFinite(tactic.budget) ? tactic.budget : 0), 0);

const enforceChannelCap = (tactics: Tactic[], capShare?: number): Tactic[] => {
  if (!capShare || capShare <= 0 || capShare >= 1) {
    return tactics;
  }
  const total = sumBudget(tactics);
  if (total <= 0) {
    return tactics;
  }
  const capValue = capShare * total;
  const channelGroups = new Map<string, { indices: number[]; total: number }>();
  tactics.forEach((tactic, index) => {
    const spend = Number.isFinite(tactic.budget) ? tactic.budget : 0;
    const group = channelGroups.get(tactic.channel) ?? { indices: [], total: 0 };
    group.indices.push(index);
    group.total += spend;
    channelGroups.set(tactic.channel, group);
  });

  const adjusted = tactics.map((tactic) => ({ ...tactic }));

  channelGroups.forEach((group) => {
    if (group.total > capValue) {
      const ratio = capValue / group.total;
      group.indices.forEach((index) => {
        adjusted[index].budget = roundCurrency(adjusted[index].budget * ratio);
      });
    }
  });

  const adjustedTotal = sumBudget(adjusted);
  let remainder = total - adjustedTotal;
  if (remainder <= 0.5) {
    return adjusted;
  }

  const capacities = new Map<string, number>();
  channelGroups.forEach((group, channel) => {
    const currentTotal = group.indices.reduce((sum, index) => sum + adjusted[index].budget, 0);
    capacities.set(channel, Math.max(capValue - currentTotal, 0));
  });
  const totalCapacity = Array.from(capacities.values()).reduce((sum, value) => sum + value, 0);

  if (totalCapacity <= 0) {
    const evenIncrement = remainder / adjusted.length;
    adjusted.forEach((tactic, index) => {
      adjusted[index] = { ...tactic, budget: roundCurrency(tactic.budget + evenIncrement) };
    });
    return adjusted;
  }

  capacities.forEach((capacity, channel) => {
    if (capacity <= 0) return;
    const channelAddition = Math.min(capacity, (capacity / totalCapacity) * remainder);
    const indices = channelGroups.get(channel)?.indices ?? [];
    const currentTotal = indices.reduce((sum, index) => sum + adjusted[index].budget, 0);
    indices.forEach((index) => {
      const share = currentTotal === 0 ? 1 / indices.length : adjusted[index].budget / currentTotal;
      adjusted[index].budget = roundCurrency(adjusted[index].budget + channelAddition * share);
    });
  });

  return adjusted.map((tactic) => ({ ...tactic, budget: roundCurrency(tactic.budget) }));
};

type BudgetAllocatorProps = {
  tactics: Tactic[];
  constraints: Plan['constraints'];
  currencyFormatter: Intl.NumberFormat;
  disabled: boolean;
  onApply: (updater: (previous: Tactic[]) => Tactic[]) => void;
  onMaxShareChange?: (value: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const BudgetAllocator = ({
  tactics,
  constraints,
  currencyFormatter,
  disabled,
  onApply,
  onMaxShareChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: BudgetAllocatorProps): JSX.Element => {
  const [capShare, setCapShare] = useState(() => (constraints.maxSharePerChannel ?? 0.6) * 100);
  const totalBudget = useMemo(() => sumBudget(tactics), [tactics]);

  useEffect(() => {
    if (constraints.maxSharePerChannel) {
      setCapShare(constraints.maxSharePerChannel * 100);
    }
  }, [constraints.maxSharePerChannel]);

  const applySplitEvenly = () => {
    onApply((previous) => {
      if (previous.length === 0) return previous;
      const total = sumBudget(previous);
      if (total === 0) {
        const fallback = constraints.minTacticBudget ?? 0;
        return previous.map((tactic) => ({ ...tactic, budget: fallback }));
      }
      const evenBudget = total / previous.length;
      return enforceChannelCap(
        previous.map((tactic) => ({ ...tactic, budget: roundCurrency(evenBudget) })),
        capShare / 100,
      );
    });
  };

  const applyEfficiencySplit = () => {
    onApply((previous) => {
      const total = sumBudget(previous);
      if (total === 0) {
        return previous;
      }
      const weights = previous.map((tactic) => {
        if (tactic.estCpm && tactic.estCpm > 0) return 1 / tactic.estCpm;
        if (tactic.estCpc && tactic.estCpc > 0) return 1 / tactic.estCpc;
        if (tactic.estCpa && tactic.estCpa > 0) return 1 / tactic.estCpa;
        return 1;
      });
      const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
      if (weightTotal === 0) {
        return previous;
      }
      const allocated = previous.map((tactic, index) => ({
        ...tactic,
        budget: roundCurrency((weights[index] / weightTotal) * total),
      }));
      return enforceChannelCap(allocated, capShare / 100);
    });
  };

  const applyCapShare = () => {
    const fraction = capShare / 100;
    onApply((previous) => enforceChannelCap(previous.map((tactic) => ({ ...tactic })), fraction));
    onMaxShareChange?.(fraction);
  };

  const applyRounding = () => {
    onApply((previous) => previous.map((tactic) => ({ ...tactic, budget: Math.round(tactic.budget / 100) * 100 })));
  };

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Budget allocator</h2>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            Redo
          </button>
        </div>
      </header>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500">Total budget</dt>
          <dd className="font-medium text-gray-900">{currencyFormatter.format(totalBudget)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500">Tactics</dt>
          <dd className="font-medium text-gray-900">{tactics.length}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={applySplitEvenly}
          disabled={disabled}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-200"
        >
          Split evenly
        </button>
        <button
          type="button"
          onClick={applyEfficiencySplit}
          disabled={disabled}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
        >
          Weight by efficiency
        </button>
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="cap-share" className="text-gray-600">
            Cap share
          </label>
          <input
            id="cap-share"
            type="number"
            value={capShare.toFixed(0)}
            onChange={(event) => setCapShare(Number.parseFloat(event.target.value) || 0)}
            onBlur={applyCapShare}
            className="w-20 rounded border border-gray-300 px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
            disabled={disabled}
            aria-describedby="cap-share-help"
          />
          <span className="text-gray-600">%</span>
        </div>
        <button
          type="button"
          onClick={applyRounding}
          disabled={disabled}
          className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
        >
          Round to nearest 100
        </button>
      </div>
      <p id="cap-share-help" className="mt-2 text-xs text-gray-500">
        Cap share applies immediately on blur. Combination of “Split evenly” then cap ensures no channel exceeds the limit.
      </p>
    </section>
  );
};

export default BudgetAllocator;
