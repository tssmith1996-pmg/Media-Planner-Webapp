import { Plan, Tactic } from '../../lib/schemas';
import { estimateTacticPerformance } from '../../lib/math';
import { formatDateRange } from '../../lib/formatters';

export type Timegrain = 'Week' | 'Fortnight' | 'Month';
export type BlockMetric = 'Budget' | 'Impressions' | 'Clicks' | 'Conversions';

export interface BlockPlanCell {
  tacticId: string;
  channel: Tactic['channel'];
  vendor?: string;
  blockStart: string;
  blockEnd: string;
  value: number;
}

export interface BlockPlanMatrix {
  columns: { label: string; start: string; end: string }[];
  rows: {
    key: string;
    label: string;
    channel: Tactic['channel'];
    vendor?: string;
    bidType?: Tactic['bidType'] | 'Mixed';
    cells: BlockPlanCell[];
    notes?: string;
    totals: Record<BlockMetric, number>;
  }[];
  grandTotals: Record<BlockMetric, number>;
}

export interface BuildBlockMatrixOptions {
  timegrain: Timegrain;
  rangeStart?: string;
  rangeEnd?: string;
  groupBy: 'Channel' | 'Tactic';
  metric: BlockMetric;
}

type DateRange = { start: Date; end: Date };

type MutableRow = {
  key: string;
  label: string;
  channel: Tactic['channel'];
  vendor?: string;
  bidType?: Tactic['bidType'] | 'Mixed';
  notes?: string;
  totals: Record<BlockMetric, number>;
  cells: number[];
};

const dayMs = 1000 * 60 * 60 * 24;

const toDate = (iso: string): Date => {
  const date = new Date(iso);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const fromDate = (date: Date): string => new Date(date.getTime()).toISOString().slice(0, 10);

const clampRange = (value: Date, range: DateRange): Date => {
  if (value.getTime() < range.start.getTime()) return range.start;
  if (value.getTime() > range.end.getTime()) return range.end;
  return value;
};

const startOfWeek = (date: Date): Date => {
  const result = new Date(date.getTime());
  const day = result.getUTCDay();
  const diff = (day + 6) % 7; // convert Sunday(0) to 6 so Monday=0
  result.setUTCDate(result.getUTCDate() - diff);
  return result;
};

const fortnightEpoch = startOfWeek(new Date(Date.UTC(2000, 0, 3))); // Mon, 3 Jan 2000

const startOfFortnight = (date: Date): Date => {
  const weekStart = startOfWeek(date);
  const weeksFromEpoch = Math.floor((weekStart.getTime() - fortnightEpoch.getTime()) / (7 * dayMs));
  if (weeksFromEpoch % 2 === 0) {
    return weekStart;
  }
  const result = new Date(weekStart.getTime());
  result.setUTCDate(result.getUTCDate() - 7);
  return result;
};

const startOfMonth = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const endOfFortnight = (start: Date): Date => addDays(start, 13);

const endOfWeek = (start: Date): Date => addDays(start, 6);

const endOfMonth = (date: Date): Date => {
  const start = startOfMonth(date);
  const nextMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return addDays(nextMonth, -1);
};

const inclusiveDaysBetween = (start: Date, end: Date): number => {
  if (end.getTime() < start.getTime()) {
    return 0;
  }
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / dayMs) + 1;
};

const overlapDays = (a: DateRange, b: DateRange): number => {
  const start = a.start.getTime() > b.start.getTime() ? a.start : b.start;
  const end = a.end.getTime() < b.end.getTime() ? a.end : b.end;
  if (end.getTime() < start.getTime()) {
    return 0;
  }
  return inclusiveDaysBetween(start, end);
};

const computeBlocks = (range: DateRange, grain: Timegrain): DateRange[] => {
  if (range.end.getTime() < range.start.getTime()) {
    return [];
  }
  const blocks: DateRange[] = [];
  let cursor: Date;
  switch (grain) {
    case 'Week':
      cursor = startOfWeek(range.start);
      break;
    case 'Fortnight':
      cursor = startOfFortnight(range.start);
      break;
    case 'Month':
      cursor = startOfMonth(range.start);
      break;
    default: {
      const exhaustive: never = grain;
      return exhaustive;
    }
  }
  while (cursor.getTime() <= range.end.getTime()) {
    let blockEnd: Date;
    switch (grain) {
      case 'Week':
        blockEnd = endOfWeek(cursor);
        break;
      case 'Fortnight':
        blockEnd = endOfFortnight(cursor);
        break;
      case 'Month':
        blockEnd = endOfMonth(cursor);
        break;
      default: {
        const exhaustive: never = grain;
        return exhaustive;
      }
    }
    const start = clampRange(cursor, range);
    const end = clampRange(blockEnd, range);
    if (end.getTime() >= range.start.getTime()) {
      blocks.push({ start, end });
    }
    if (grain === 'Month') {
      cursor = addDays(blockEnd, 1);
      cursor = startOfMonth(cursor);
    } else {
      cursor = addDays(cursor, grain === 'Week' ? 7 : 14);
    }
  }
  return blocks;
};

const prorate = (total: number, flight: DateRange, blocks: DateRange[]): number[] => {
  if (!Number.isFinite(total) || total <= 0) {
    return blocks.map(() => 0);
  }
  const flightDays = inclusiveDaysBetween(flight.start, flight.end);
  if (flightDays === 0) {
    return blocks.map(() => 0);
  }
  const perDay = total / flightDays;
  return blocks.map((block) => {
    const overlap = overlapDays(flight, block);
    if (overlap <= 0) {
      return 0;
    }
    return perDay * overlap;
  });
};

const createEmptyTotals = (): Record<BlockMetric, number> => ({
  Budget: 0,
  Impressions: 0,
  Clicks: 0,
  Conversions: 0,
});

const ensureRow = (
  rows: Map<string, MutableRow>,
  key: string,
  initializer: () => MutableRow,
): MutableRow => {
  let row = rows.get(key);
  if (!row) {
    row = initializer();
    rows.set(key, row);
  }
  return row;
};

const summariseTactic = (tactic: Tactic) => {
  const performance = estimateTacticPerformance(tactic);
  return {
    totals: {
      Budget: Number.isFinite(tactic.budget) ? tactic.budget : 0,
      Impressions: performance.impressions,
      Clicks: performance.clicks,
      Conversions: performance.conversions,
    } satisfies Record<BlockMetric, number>,
  };
};

export function buildBlockPlanMatrix(plan: Plan, opts: BuildBlockMatrixOptions): BlockPlanMatrix {
  const campaignRange: DateRange = {
    start: toDate(plan.campaign.startDate),
    end: toDate(plan.campaign.endDate),
  };
  const requestedRange: DateRange = {
    start: opts.rangeStart ? toDate(opts.rangeStart) : campaignRange.start,
    end: opts.rangeEnd ? toDate(opts.rangeEnd) : campaignRange.end,
  };
  const exportRange: DateRange = {
    start: clampRange(requestedRange.start, campaignRange),
    end: clampRange(requestedRange.end, campaignRange),
  };
  const blocks = computeBlocks(exportRange, opts.timegrain);
  const blockColumns = blocks.map((block) => ({
    start: fromDate(block.start),
    end: fromDate(block.end),
    label: formatDateRange(fromDate(block.start), fromDate(block.end)),
  }));

  const rows = new Map<string, MutableRow>();

  const grandTotals = createEmptyTotals();

  blocks.forEach((_, idx) => {
    rows.forEach((row) => {
      row.cells[idx] = 0;
    });
  });

  plan.tactics.forEach((tactic) => {
    const tacticRange: DateRange = { start: toDate(tactic.flightStart), end: toDate(tactic.flightEnd) };
    if (tacticRange.end.getTime() < exportRange.start.getTime() || tacticRange.start.getTime() > exportRange.end.getTime()) {
      return;
    }

    const { totals } = summariseTactic(tactic);
    const prorated = prorate(totals[opts.metric], tacticRange, blocks);

    const rowKey = opts.groupBy === 'Channel' ? tactic.channel : tactic.id;
    const rowLabel = opts.groupBy === 'Channel'
      ? tactic.channel
      : [tactic.channel, tactic.vendor].filter(Boolean).join(' — ') || tactic.channel;
    const rowVendor = opts.groupBy === 'Channel' ? undefined : tactic.vendor;

    const row = ensureRow(rows, rowKey, () => ({
      key: rowKey,
      label: rowLabel,
      channel: tactic.channel,
      vendor: rowVendor,
      bidType: tactic.bidType,
      notes: opts.groupBy === 'Tactic' ? tactic.notes : undefined,
      totals: createEmptyTotals(),
      cells: blocks.map(() => 0),
    }));

    if (opts.groupBy === 'Channel') {
      if (row.vendor && tactic.vendor && row.vendor !== tactic.vendor) {
        row.vendor = 'Multiple';
      } else if (!row.vendor && tactic.vendor) {
        row.vendor = tactic.vendor;
      }
      if (row.bidType && row.bidType !== tactic.bidType) {
        row.bidType = 'Mixed';
      }
    }

    if (opts.groupBy === 'Tactic') {
      row.bidType = tactic.bidType;
      row.vendor = tactic.vendor;
    }

    (Object.keys(totals) as BlockMetric[]).forEach((metric) => {
      row.totals[metric] += totals[metric];
      grandTotals[metric] += totals[metric];
    });

    prorated.forEach((value, idx) => {
      row.cells[idx] += value;
    });
  });

  const matrixRows = Array.from(rows.values()).map((row) => ({
    key: row.key,
    label: row.label,
    channel: row.channel,
    vendor: row.vendor,
    bidType: row.bidType,
    notes: row.notes,
    totals: row.totals,
    cells: row.cells.map((value, idx) => ({
      tacticId: row.key,
      channel: row.channel,
      vendor: row.vendor,
      blockStart: blockColumns[idx]?.start ?? '',
      blockEnd: blockColumns[idx]?.end ?? '',
      value,
    })),
  }));

  return {
    columns: blockColumns,
    rows: matrixRows,
    grandTotals,
  };
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  const samplePlan: Plan = {
    id: 'p',
    campaign: {
      id: 'c',
      name: 'Sample',
      brand: 'Brand',
      objective: 'Awareness',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      currency: 'USD',
      goal: { kpi: 'Impressions', target: 1000 },
    },
    tactics: [
      {
        id: 't1',
        channel: 'Search',
        vendor: 'Google',
        flightStart: '2024-01-01',
        flightEnd: '2024-01-14',
        budget: 1400,
        bidType: 'CPC',
        estCpc: 2,
      },
      {
        id: 't2',
        channel: 'Social',
        vendor: 'Meta',
        flightStart: '2024-01-15',
        flightEnd: '2024-01-31',
        budget: 1700,
        bidType: 'CPM',
        estCpm: 10,
      },
    ],
    constraints: {},
    status: 'Draft',
    lastModified: '2024-01-01',
  };

  test('block plan matrix sums to tactic totals for week grain', () => {
    const matrix = buildBlockPlanMatrix(samplePlan, {
      groupBy: 'Tactic',
      metric: 'Budget',
      timegrain: 'Week',
    });
    const totalBudget = matrix.rows.reduce((sum, row) => sum + row.totals.Budget, 0);
    expect(totalBudget).toBeCloseTo(3100, 6);
    const blockSum = matrix.rows.flatMap((row) => row.cells).reduce((sum, cell) => sum + cell.value, 0);
    expect(blockSum).toBeCloseTo(3100, 6);
  });

  test('fortnight grain prorates overlapping tactics', () => {
    const matrix = buildBlockPlanMatrix(samplePlan, {
      groupBy: 'Channel',
      metric: 'Budget',
      timegrain: 'Fortnight',
    });
    expect(matrix.columns).toHaveLength(2);
    const row = matrix.rows.find((r) => r.key === 'Search');
    expect(row?.cells[0]?.value).toBeGreaterThan(0);
  });
}
