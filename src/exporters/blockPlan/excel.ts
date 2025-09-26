import * as XLSX from 'xlsx';
import type { Plan } from '@/lib/schemas';
import { buildBlockPlanMatrix, buildTotalsRow, sumRow } from './common';

export async function buildExcelWorkbook(plan: Plan) {
  const matrix = buildBlockPlanMatrix(plan);
  const header = ['Tactic', 'Channel', 'Flight', ...matrix.buckets, 'Total'];
  const rows = matrix.rows.map((row) => [row.tactic, row.channel, row.flight, ...row.buckets, sumRow(row)]);
  const totals = ['Total', '', '', ...buildTotalsRow(matrix), matrix.rows.reduce((acc, row) => acc + sumRow(row), 0)];

  const blockSheet = XLSX.utils.aoa_to_sheet([header, ...rows, totals]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, blockSheet, 'Block Plan');

  const assumptions = XLSX.utils.aoa_to_sheet([
    ['Plan Name', plan.meta.name],
    ['Plan Code', plan.meta.code],
    ['Version', plan.meta.version],
    ['Status', plan.status],
    ['Approver', plan.approver ?? 'Pending'],
  ]);
  XLSX.utils.book_append_sheet(workbook, assumptions, 'Assumptions');

  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
