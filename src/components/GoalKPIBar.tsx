import { CampaignGoalKpi } from '../lib/schemas';

const kpiLabels: Record<CampaignGoalKpi, string> = {
  Reach: 'Reach',
  Impressions: 'Impressions',
  Clicks: 'Clicks',
  Conversions: 'Conversions',
  ROAS: 'ROAS',
};

type GoalKPIBarProps = {
  kpi: CampaignGoalKpi;
  target: number;
  actual: number;
  currency: string;
};

const formatValue = (kpi: CampaignGoalKpi, value: number, currency: string): string => {
  if (!Number.isFinite(value)) return '—';
  if (kpi === 'ROAS') {
    return `${value.toFixed(2)}x`;
  }
  if (kpi === 'Conversions' || kpi === 'Clicks') {
    return new Intl.NumberFormat().format(Math.round(value));
  }
  if (kpi === 'Reach' || kpi === 'Impressions') {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
};

const determineColor = (ratio: number) => {
  if (ratio >= 1) return 'bg-emerald-500';
  if (ratio >= 0.9) return 'bg-amber-500';
  return 'bg-rose-500';
};

const determineTextColor = (ratio: number) => {
  if (ratio >= 1) return 'text-emerald-700';
  if (ratio >= 0.9) return 'text-amber-700';
  return 'text-rose-700';
};

const GoalKPIBar = ({ kpi, target, actual, currency }: GoalKPIBarProps): JSX.Element => {
  const safeTarget = target <= 0 ? 1 : target;
  const progressPercent = Math.max(0, Math.min((actual / safeTarget) * 100, 120));
  const barColor = determineColor(actual / safeTarget);
  const textColor = determineTextColor(actual / safeTarget);

  return (
    <section className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Goal Alignment</h2>
        <span className={`text-sm font-medium ${textColor}`}>
          {formatValue(kpi, actual, currency)} / {formatValue(kpi, target, currency)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuemin={0} aria-valuenow={Math.min(progressPercent, 110)} aria-valuemax={100} aria-label={`${kpiLabels[kpi]} progress`}>
          <div className={`absolute inset-y-0 left-0 transition-all duration-300 ${barColor}`} style={{ width: `${Math.min(progressPercent, 110)}%` }} />
          <div className="absolute inset-y-0 w-0.5 bg-gray-700" style={{ left: '100%' }} aria-hidden />
        </div>
        <span className="text-sm text-gray-600">{kpiLabels[kpi]}</span>
      </div>
    </section>
  );
};

export default GoalKPIBar;
