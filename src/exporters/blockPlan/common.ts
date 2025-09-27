import type { Plan } from '@/lib/schemas';
import { formatDateRange } from '@/lib/date';
import { prorateLineItem } from '@/lib/math';

export type BlockPlanRow = {
  lineItem: string;
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

export function buildBlockPlanMatrix(plan: Plan, bucketCount = 4): BlockPlanMatrix {
  const buckets = buildBucketLabels().slice(0, bucketCount);
  const rows: BlockPlanRow[] = plan.lineItems.map((lineItem) => {
    const flight = plan.flights.find((item) => item.flight_id === lineItem.flight_id);
    const creative = plan.creatives.find((item) => item.creative_id === lineItem.creative_id);
    return {
      lineItem: creative?.ad_name ?? lineItem.line_item_id,
      channel: lineItem.channel,
      flight: flight ? formatDateRange(flight.start_date, flight.end_date) : '—',
      budget: lineItem.cost_planned,
      buckets: prorateLineItem(lineItem, flight, bucketCount),
    };
  });

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
