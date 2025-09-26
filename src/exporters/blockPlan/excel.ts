import * as XLSX from 'xlsx';
import type { BlockPlanMatrix } from './common';
import type { ExportUIOptions } from './templates';
import type { Plan } from '../../lib/schemas';
import { createCurrencyFormatter, roundValue, formatDateRange } from '../../lib/formatters';
import { estimateRevenue, estimateROAS, CHANNEL_CTR_DEFAULTS, CHANNEL_CVR_DEFAULTS } from '../../lib/math';
import { buildMetaColumns, MetaColumn } from './metaColumns';
import { buildExportFileName } from './utils';

const MONEY_FORMAT = '[$$-409]#,##0';
const INT_FORMAT = '#,##0';
const ABBREVIATED_FORMAT = '[>=1000000]0.0,,"M";[>=1000]0.0,"K";0';

const currencySymbolFrom = (formatter: Intl.NumberFormat): string => {
  const sample = formatter.format(1);
  const symbol = sample.replace(/[0-9.,\s]/g, '');
  return symbol || '$';
};

const applyCellStyle = (
  sheet: XLSX.WorkSheet,
  rowIndex: number,
  colIndex: number,
  style: XLSX.CellObject['s'],
) => {
  const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  const cell = sheet[cellAddress];
  if (cell) {
    cell.s = { ...(cell.s ?? {}), ...(style ?? {}) };
  }
};

const addColumnFormats = (
  sheet: XLSX.WorkSheet,
  metaColumns: MetaColumn[],
  blockCount: number,
  ui: ExportUIOptions,
  currencySymbol: string,
) => {
  const rangeRef = sheet['!ref'];
  if (!rangeRef) {
    return;
  }
  const range = XLSX.utils.decode_range(rangeRef);
  metaColumns.forEach((col, idx) => {
    const cellAddress = XLSX.utils.encode_col(idx);
    if (col.metric === 'Budget') {
      sheet['!cols'] = sheet['!cols'] ?? [];
      sheet['!cols'][idx] = { wch: 14 };
    }
    for (let rowIdx = 3; rowIdx <= range.e.r; rowIdx += 1) {
      const cellRef = `${cellAddress}${rowIdx + 1}`;
      const cell = sheet[cellRef];
      if (!cell) continue;
      if (col.isCurrency) {
        cell.z = ui.abbreviate ? `[>=1000000]${currencySymbol}0.0,,"M";[>=1000]${currencySymbol}0.0,"K";${currencySymbol}0` : MONEY_FORMAT;
      } else if (col.isRoas) {
        cell.z = '0.00x';
      } else if (typeof cell.v === 'number') {
        cell.z = ui.abbreviate ? ABBREVIATED_FORMAT : INT_FORMAT;
      }
    }
  });
  const startMeta = metaColumns.length;
  for (let blockIdx = 0; blockIdx < blockCount; blockIdx += 1) {
    const colIdx = startMeta + blockIdx;
    sheet['!cols'] = sheet['!cols'] ?? [];
    sheet['!cols'][colIdx] = { wch: 12 };
  }
  if (ui.columns.showTotalsColumn) {
    const totalsIndex = startMeta + blockCount;
    sheet['!cols'] = sheet['!cols'] ?? [];
    sheet['!cols'][totalsIndex] = { wch: 12 };
  }
};

export const exportBlockPlanToExcel = async (
  matrix: BlockPlanMatrix,
  plan: Plan,
  ui: ExportUIOptions,
): Promise<void> => {
  const workbook = XLSX.utils.book_new();
  const averageOrderValue = ui.averageOrderValue ?? 0;
  const metaColumns = buildMetaColumns(matrix, ui, averageOrderValue);
  const blockCount = matrix.columns.length;
  const currencyCode = ui.currency ?? plan.campaign.currency;
  const currencyFormatter = createCurrencyFormatter(currencyCode, { maximumFractionDigits: 0 });
  const currencySymbol = currencySymbolFrom(currencyFormatter);
  const headerColor = (ui.brand.primary ?? '#0f172a').replace('#', '').toUpperCase();

  const headerRows: (string | number)[][] = [];
  headerRows.push([`${plan.campaign.name} – Block Plan`]);
  headerRows.push([
    `Client: ${ui.brand.client ?? plan.campaign.brand}`,
    `Date range: ${formatDateRange(plan.campaign.startDate, plan.campaign.endDate)}`,
    `Currency: ${currencyCode}`,
  ]);
  headerRows.push([]);

  const tableHeader = [
    ...metaColumns.map((col) => col.header),
    ...matrix.columns.map((column) => column.label),
  ];
  if (ui.columns.showTotalsColumn) {
    tableHeader.push('Total');
  }
  headerRows.push(tableHeader);

  const rounding = ui.rounding;
  const tableRows = matrix.rows.map((row) => {
    const values: (string | number)[] = [];
    metaColumns.forEach((col) => {
      const raw = col.extractor(row);
      if (typeof raw === 'number') {
        const rounded = roundValue(raw, rounding);
        values.push(rounded);
      } else {
        values.push(raw);
      }
    });
    const cellValues = matrix.columns.map((_, idx) => roundValue(row.cells[idx]?.value ?? 0, rounding));
    values.push(...cellValues);
    if (ui.columns.showTotalsColumn) {
      const total = cellValues.reduce((sum, value) => sum + value, 0);
      values.push(roundValue(total, rounding));
    }
    return values;
  });

  if (ui.columns.showTotalsRow) {
    const totalsRow: (string | number)[] = [];
    metaColumns.forEach((col, idx) => {
      if (idx === 0) {
        totalsRow.push('Grand total');
        return;
      }
      if (col.metric) {
        const total = matrix.grandTotals[col.metric];
        totalsRow.push(roundValue(total, rounding));
      } else if (col.isRoas) {
        if (averageOrderValue > 0) {
          const revenue = estimateRevenue(matrix.grandTotals.Conversions, averageOrderValue);
          totalsRow.push(estimateROAS(revenue, matrix.grandTotals.Budget));
        } else {
          totalsRow.push('');
        }
      } else {
        totalsRow.push('');
      }
    });
    const columnTotals = matrix.columns.map((_, idx) => {
      const sum = matrix.rows.reduce((total, row) => total + (row.cells[idx]?.value ?? 0), 0);
      return roundValue(sum, rounding);
    });
    totalsRow.push(...columnTotals);
    if (ui.columns.showTotalsColumn) {
      const metricTotal = columnTotals.reduce((sum, value) => sum + value, 0);
      totalsRow.push(roundValue(metricTotal, rounding));
    }
    tableRows.push(totalsRow);
  }

  const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...tableRows]);
  worksheet['!freeze'] = { xSplit: metaColumns.length, ySplit: 4 };

  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: tableHeader.length - 1 } }];
  applyCellStyle(worksheet, 0, 0, { font: { bold: true, sz: 16 } });
  for (let col = 0; col < tableHeader.length; col += 1) {
    applyCellStyle(worksheet, 3, col, {
      font: { bold: true },
      fill: { fgColor: { rgb: headerColor } },
      alignment: { horizontal: 'center' },
    });
  }

  if (ui.columns.showTotalsRow) {
    const totalsRowIndex = headerRows.length + tableRows.length - 1;
    for (let col = 0; col < tableHeader.length; col += 1) {
      applyCellStyle(worksheet, totalsRowIndex, col, {
        font: { bold: true },
      });
    }
  }

  addColumnFormats(worksheet, metaColumns, blockCount, ui, currencySymbol);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Block Plan');

  const totalsSheetData: (string | number)[][] = [
    ['Metric', 'Value'],
    ['Total Budget', roundValue(matrix.grandTotals.Budget, rounding)],
    ['Impressions', roundValue(matrix.grandTotals.Impressions, rounding)],
    ['Clicks', roundValue(matrix.grandTotals.Clicks, rounding)],
    ['Conversions', roundValue(matrix.grandTotals.Conversions, rounding)],
  ];
  if (averageOrderValue > 0) {
    const revenue = estimateRevenue(matrix.grandTotals.Conversions, averageOrderValue);
    totalsSheetData.push(['Revenue', roundValue(revenue, rounding)]);
    totalsSheetData.push([
      'ROAS',
      estimateROAS(revenue, matrix.grandTotals.Budget).toFixed(2),
    ]);
  }

  totalsSheetData.push([]);
  totalsSheetData.push(['Channel', 'Budget', 'Share %']);
  const channelBudgets = new Map<string, number>();
  plan.tactics.forEach((tactic) => {
    channelBudgets.set(tactic.channel, (channelBudgets.get(tactic.channel) ?? 0) + (tactic.budget ?? 0));
  });
  const totalBudget = matrix.grandTotals.Budget || 1;
  channelBudgets.forEach((budget, channel) => {
    totalsSheetData.push([
      channel,
      roundValue(budget, rounding),
      Number(((budget / totalBudget) * 100).toFixed(2)),
    ]);
  });

  const totalsSheet = XLSX.utils.aoa_to_sheet(totalsSheetData);
  XLSX.utils.book_append_sheet(workbook, totalsSheet, 'Totals & Mix');

  const assumptionsData: (string | number)[][] = [
    ['Channel', 'CTR default', 'CVR default'],
    ...Object.keys(CHANNEL_CTR_DEFAULTS).map((channel) => [
      channel,
      `${(CHANNEL_CTR_DEFAULTS[channel as keyof typeof CHANNEL_CTR_DEFAULTS] * 100).toFixed(2)}%`,
      `${(CHANNEL_CVR_DEFAULTS[channel as keyof typeof CHANNEL_CVR_DEFAULTS] * 100).toFixed(2)}%`,
    ]),
  ];
  assumptionsData.push(['Average order value', averageOrderValue > 0 ? currencyFormatter.format(averageOrderValue) : 'n/a']);
  const assumptionsSheet = XLSX.utils.aoa_to_sheet(assumptionsData);
  XLSX.utils.book_append_sheet(workbook, assumptionsSheet, 'Assumptions');

  const blob = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const fileName = buildExportFileName(plan, 'xlsx');
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
