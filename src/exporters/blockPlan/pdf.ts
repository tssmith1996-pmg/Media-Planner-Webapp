import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Plan } from '@/lib/schemas';
import { buildBlockPlanMatrix, buildTotalsRow, sumRow } from './common';
import { flags } from '@/app/featureFlags';
import { buildPacingWarnings } from '@/lib/math';

export async function buildPdf(plan: Plan) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const matrix = buildBlockPlanMatrix(plan);

  doc.setFontSize(18);
  doc.text('Block Plan', 14, 18);
  doc.setFontSize(11);
  doc.text(`Plan: ${plan.meta.name} (${plan.meta.code})`, 14, 26);
  doc.text(`Version ${plan.meta.version} • Status ${plan.status}`, 14, 33);
  doc.text(`Approver: ${plan.approver ?? 'Pending'}`, 14, 40);

  const body = matrix.rows.map((row) => [
    row.lineItem,
    row.channel,
    row.flight,
    ...row.buckets.map((value) => value.toFixed(0)),
    sumRow(row).toFixed(0),
  ]);
  const totals = buildTotalsRow(matrix).map((value) => value.toFixed(0));

  autoTable(doc, {
    startY: 48,
    head: [['Line Item', 'Channel', 'Flight', ...matrix.buckets, 'Total']],
    body,
    foot: [['Total', '', '', ...totals, matrix.rows.reduce((acc, row) => acc + sumRow(row), 0).toFixed(0)]],
    theme: 'grid',
  });

  if (plan.status === 'Draft') {
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(60);
    doc.text('DRAFT', 180, 140, { angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  const warnings = buildPacingWarnings(plan);
  if (flags.enableExportWarningsPage && warnings.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Pacing Warnings', 14, 18);
    doc.setFontSize(11);
    warnings.forEach((warning, index) => {
      doc.text(`• ${warning}`, 14, 28 + index * 8);
    });
  }

  return doc.output('blob');
}
