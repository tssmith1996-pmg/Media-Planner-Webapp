import type { Plan, Tactic } from '@/lib/schemas';
import { formatDateRange } from '@/lib/date';
import { prorateTactic } from '@/lib/math';

export type BlockPlanRow = {
  tactic: string;
  channel: string;
  flight: string;
  budget: number;
  buckets: number[];
};

export type BlockPlanMatrix = {
  planName: string;
  planCode: string;
  version: number;
  rows: BlockPlanRow[];
  buckets: string[];
};

export function buildBucketLabels(): string[] {
  return ['Flight 1', 'Flight 2', 'Flight 3', 'Flight 4'];
}

export function bucketTactic(tactic: Tactic, bucketCount: number) {
  return prorateTactic(tactic, bucketCount);
}

export function buildBlockPlanMatrix(plan: Plan, bucketCount = 4): BlockPlanMatrix {
  const buckets = buildBucketLabels().slice(0, bucketCount);
  const rows: BlockPlanRow[] = plan.tactics.map((tactic) => ({
    tactic: tactic.name,
    channel: tactic.channel,
    flight: formatDateRange(tactic.startDate, tactic.endDate),
    budget: tactic.budget,
    buckets: bucketTactic(tactic, bucketCount),
  }));

  return {
    planName: plan.meta.name,
    planCode: plan.meta.code,
    version: plan.meta.version,
    rows,
    buckets,
  };
}

export function sumRow(row: BlockPlanRow) {
  return row.buckets.reduce((total, value) => total + value, 0);
}

export function buildTotalsRow(matrix: BlockPlanMatrix) {
  const totals = new Array(matrix.buckets.length).fill(0);
  for (const row of matrix.rows) {
    row.buckets.forEach((value, index) => {
      totals[index] += value;
    });
  }
  return totals;
}

export function exportFilename(plan: Plan, ext: 'pdf' | 'xlsx') {
  const ymd = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replaceAll('/', '');
  return `BlockPlan_${plan.meta.code}_v${plan.meta.version}_${ymd}.${ext}`;
}
