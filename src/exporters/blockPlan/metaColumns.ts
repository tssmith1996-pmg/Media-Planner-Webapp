import type { BlockPlanMatrix, BlockMetric } from './common';
import type { ExportUIOptions } from './templates';
import { estimateRevenue, estimateROAS } from '../../lib/math';

type MetaColumn = {
  key: string;
  header: string;
  metric?: BlockMetric;
  extractor: (row: BlockPlanMatrix['rows'][number]) => string | number;
  isCurrency?: boolean;
  isRoas?: boolean;
};

export const buildMetaColumns = (
  _matrix: BlockPlanMatrix,
  ui: ExportUIOptions,
  averageOrderValue: number,
): MetaColumn[] => {
  const labelHeader = ui.layout.groupBy === 'Channel' ? 'Channel' : 'Tactic';
  const columns: MetaColumn[] = [
    {
      key: 'label',
      header: labelHeader,
      extractor: (row) => row.label,
    },
  ];
  if (ui.columns.showChannel && ui.layout.groupBy === 'Tactic') {
    columns.push({
      key: 'channel',
      header: 'Channel',
      extractor: (row) => row.channel,
    });
  }
  if (ui.columns.showVendor) {
    columns.push({
      key: 'vendor',
      header: 'Vendor',
      extractor: (row) => row.vendor ?? '',
    });
  }
  if (ui.columns.showBidType) {
    columns.push({
      key: 'bidType',
      header: 'Bid Type',
      extractor: (row) => row.bidType ?? '',
    });
  }
  if (ui.columns.showBudget) {
    columns.push({
      key: 'budget',
      header: 'Budget',
      extractor: (row) => row.totals.Budget,
      metric: 'Budget',
      isCurrency: true,
    });
  }
  if (ui.columns.showImpressions) {
    columns.push({
      key: 'impressions',
      header: 'Impressions',
      extractor: (row) => row.totals.Impressions,
      metric: 'Impressions',
    });
  }
  if (ui.columns.showClicks) {
    columns.push({
      key: 'clicks',
      header: 'Clicks',
      extractor: (row) => row.totals.Clicks,
      metric: 'Clicks',
    });
  }
  if (ui.columns.showConversions) {
    columns.push({
      key: 'conversions',
      header: 'Conversions',
      extractor: (row) => row.totals.Conversions,
      metric: 'Conversions',
    });
  }
  if (ui.columns.showRoas) {
    columns.push({
      key: 'roas',
      header: 'ROAS',
      extractor: (row) => {
        if (averageOrderValue <= 0) return 0;
        const revenue = estimateRevenue(row.totals.Conversions, averageOrderValue);
        return estimateROAS(revenue, row.totals.Budget);
      },
      isRoas: true,
    });
  }
  if (ui.columns.showNotes) {
    columns.push({
      key: 'notes',
      header: 'Notes',
      extractor: (row) => row.notes ?? '',
    });
  }
  return columns;
};

export type { MetaColumn };
