import { useMemo } from 'react';
import type { PacingWarning } from './PacingWarnings';

type SummarySidebarProps = {
  totals: {
    budget: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    roas: number;
  };
  currencyFormatter: Intl.NumberFormat;
  numberFormatter: Intl.NumberFormat;
  averageOrderValue: number;
  onAverageOrderValueChange: (value: number) => void;
  channelMix: Array<{ channel: string; budget: number }>;
  warnings: PacingWarning[];
  onQuickExport?: () => void;
};

const channelColors: Record<string, string> = {
  Search: '#1d4ed8',
  Social: '#9333ea',
  Display: '#0f172a',
  Video: '#ea580c',
  Audio: '#0ea5e9',
  DOOH: '#22c55e',
  Affiliate: '#6366f1',
  'Retail Media': '#db2777',
  Other: '#6b7280',
};

const aggregateMix = (channelMix: SummarySidebarProps['channelMix']) => {
  const totals = new Map<string, number>();
  channelMix.forEach(({ channel, budget }) => {
    totals.set(channel, (totals.get(channel) ?? 0) + (Number.isFinite(budget) ? budget : 0));
  });
  return Array.from(totals.entries()).map(([channel, budget]) => ({ channel, budget }));
};

const SummarySidebar = ({
  totals,
  currencyFormatter,
  numberFormatter,
  averageOrderValue,
  onAverageOrderValueChange,
  channelMix,
  warnings,
  onQuickExport,
}: SummarySidebarProps): JSX.Element => {
  const aggregatedMix = useMemo(() => aggregateMix(channelMix), [channelMix]);
  const totalBudget = totals.budget;
  const donutRadius = 48;
  const circumference = 2 * Math.PI * donutRadius;
  let offset = 0;

  const eCpm = totals.impressions > 0 ? (totals.budget / totals.impressions) * 1000 : 0;
  const eCpc = totals.clicks > 0 ? totals.budget / totals.clicks : 0;
  const eCpa = totals.conversions > 0 ? totals.budget / totals.conversions : 0;

  const topWarnings = warnings.slice(0, 3);

  return (
    <aside className="flex min-h-full flex-col gap-4 rounded-lg bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Plan summary</h2>
          {onQuickExport && (
            <button
              type="button"
              onClick={onQuickExport}
              className="text-xs font-medium text-blue-600 hover:text-blue-500 hover:underline"
            >
              Quick export
            </button>
          )}
        </div>
        <dl className="mt-3 space-y-2 text-sm text-gray-600">
          <div className="flex items-baseline justify-between">
            <dt>Total budget</dt>
            <dd className="font-medium text-gray-900">{currencyFormatter.format(totals.budget)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt>Estimated revenue</dt>
            <dd className="font-medium text-gray-900">{currencyFormatter.format(totals.revenue)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt>ROAS</dt>
            <dd className="font-medium text-gray-900">{totals.roas.toFixed(2)}x</dd>
          </div>
        </dl>
        <div className="mt-3 text-xs text-gray-500">
          <label className="flex flex-col gap-1">
            Avg. order value
            <input
              type="number"
              value={averageOrderValue}
              onChange={(event) => onAverageOrderValueChange(Number.parseFloat(event.target.value) || 0)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700">Derived metrics</h3>
        <dl className="mt-2 space-y-2 text-sm text-gray-600">
          <div className="flex items-baseline justify-between">
            <dt>eCPM</dt>
            <dd>{currencyFormatter.format(eCpm)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt>eCPC</dt>
            <dd>{currencyFormatter.format(eCpc)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt>eCPA</dt>
            <dd>{currencyFormatter.format(eCpa)}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt>Impressions</dt>
            <dd>{numberFormatter.format(Math.round(totals.impressions))}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt>Clicks</dt>
            <dd>{numberFormatter.format(Math.round(totals.clicks))}</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt>Conversions</dt>
            <dd>{numberFormatter.format(Math.round(totals.conversions))}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700">Channel mix</h3>
        <div className="mt-3 flex flex-col items-center gap-3">
          <svg viewBox="0 0 120 120" className="h-32 w-32">
            <circle cx="60" cy="60" r={donutRadius} fill="transparent" stroke="#e5e7eb" strokeWidth={16} />
            {aggregatedMix.map(({ channel, budget }) => {
              const share = totalBudget > 0 ? budget / totalBudget : 0;
              const length = share * circumference;
              const dashArray = `${length} ${circumference - length}`;
              const stroke = channelColors[channel] ?? '#94a3b8';
              const dashOffset = offset;
              offset -= length;
              const element = (
                <circle
                  key={channel}
                  cx="60"
                  cy="60"
                  r={donutRadius}
                  fill="transparent"
                  stroke={stroke}
                  strokeWidth={16}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              );
              return element;
            })}
          </svg>
          <ul className="w-full space-y-1 text-xs text-gray-600">
            {aggregatedMix.map(({ channel, budget }) => {
              const share = totalBudget > 0 ? (budget / totalBudget) * 100 : 0;
              return (
                <li key={channel} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: channelColors[channel] ?? '#94a3b8' }} />
                    {channel}
                  </span>
                  <span className="font-medium text-gray-900">{share.toFixed(1)}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700">Top risks</h3>
        {topWarnings.length === 0 ? (
          <p className="mt-2 text-xs text-emerald-600">No pacing or policy risks detected.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-xs text-rose-600">
            {topWarnings.map((warning) => (
              <li key={warning.id}>{warning.message}</li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
};

export default SummarySidebar;
