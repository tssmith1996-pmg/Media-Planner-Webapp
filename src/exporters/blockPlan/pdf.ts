import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BlockPlanMatrix } from './common';
import type { ExportUIOptions } from './templates';
import type { Plan } from '../../lib/schemas';
import { buildMetaColumns } from './metaColumns';
import { createCurrencyFormatter, roundValue, formatDateRange, formatMetricValue } from '../../lib/formatters';
import { estimateRevenue, estimateROAS } from '../../lib/math';
import { buildExportFileName, hexToRgb } from './utils';
import type { PacingWarning } from '../../components/PacingWarnings';

const rowStyleMap = {
  compact: { fontSize: 8, cellPadding: 2 },
  normal: { fontSize: 9, cellPadding: 4 },
  comfy: { fontSize: 10, cellPadding: 6 },
} as const;

const warningSeverityLabel: Record<PacingWarning['severity'], string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

export const exportBlockPlanToPdf = async (
  matrix: BlockPlanMatrix,
  plan: Plan,
  ui: ExportUIOptions,
  warnings: PacingWarning[] = [],
): Promise<void> => {
  const orientation = ui.layout.orientation ?? 'landscape';
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const margin = 48;
  const headerPrimary = ui.brand.primary ?? '#0f172a';
  const [headerR, headerG, headerB] = hexToRgb(headerPrimary);
  const secondaryColor = ui.brand.secondary ?? '#6b7280';
  const [secondaryR, secondaryG, secondaryB] = hexToRgb(secondaryColor);
  const currencyCode = ui.currency ?? plan.campaign.currency;
  const currencyFormatter = createCurrencyFormatter(currencyCode, { maximumFractionDigits: 0 });
  const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const averageOrderValue = ui.averageOrderValue ?? 0;
  const metaColumns = buildMetaColumns(matrix, ui, averageOrderValue);
  const tableHeader = [
    ...metaColumns.map((column) => column.header),
    ...matrix.columns.map((column) => column.label),
  ];
  if (ui.columns.showTotalsColumn) {
    tableHeader.push('Total');
  }
  const rounding = ui.rounding;
  const metricIsCurrency = ui.metric === 'Budget';
  const metricFormatter = metricIsCurrency ? currencyFormatter : numberFormatter;

  const tableBody = matrix.rows.map((row) => {
    const values: (string | number)[] = [];
    metaColumns.forEach((column) => {
      const raw = column.extractor(row);
      if (typeof raw === 'number') {
        if (column.isRoas) {
          values.push(`${raw.toFixed(2)}x`);
        } else if (column.isCurrency) {
          values.push(currencyFormatter.format(roundValue(raw, rounding)));
        } else {
          values.push(
            formatMetricValue(raw, {
              rounding,
              abbreviate: ui.abbreviate,
              formatter: numberFormatter,
            }).display,
          );
        }
      } else {
        values.push(raw);
      }
    });
    const blockDisplays = matrix.columns.map((_, idx) =>
      formatMetricValue(row.cells[idx]?.value ?? 0, {
        rounding,
        abbreviate: ui.abbreviate,
        formatter: metricFormatter,
      }).display,
    );
    values.push(...blockDisplays);
    if (ui.columns.showTotalsColumn) {
      const totalRaw = row.cells.reduce((sum, cell) => sum + (cell.value ?? 0), 0);
      values.push(
        formatMetricValue(totalRaw, {
          rounding,
          abbreviate: ui.abbreviate,
          formatter: metricFormatter,
        }).display,
      );
    }
    return values;
  });

  let totalsRow: (string | number)[] | undefined;
  if (ui.columns.showTotalsRow) {
    totalsRow = [];
    metaColumns.forEach((column, idx) => {
      if (idx === 0) {
        totalsRow?.push('Grand total');
        return;
      }
      if (column.metric) {
        const total = matrix.grandTotals[column.metric];
        const formatter = column.isCurrency ? currencyFormatter : numberFormatter;
        totalsRow?.push(
          formatMetricValue(total, {
            rounding,
            abbreviate: ui.abbreviate,
            formatter,
          }).display,
        );
      } else if (column.isRoas) {
        if (averageOrderValue > 0) {
          const revenue = estimateRevenue(matrix.grandTotals.Conversions, averageOrderValue);
          totalsRow?.push(`${estimateROAS(revenue, matrix.grandTotals.Budget).toFixed(2)}x`);
        } else {
          totalsRow?.push('');
        }
      } else {
        totalsRow?.push('');
      }
    });
    const blockTotals = matrix.columns.map((_, idx) => {
      const sum = matrix.rows.reduce((total, row) => total + (row.cells[idx]?.value ?? 0), 0);
      return {
        raw: sum,
        display: formatMetricValue(sum, {
          rounding,
          abbreviate: ui.abbreviate,
          formatter: metricFormatter,
        }).display,
      };
    });
    totalsRow.push(...blockTotals.map((entry) => entry.display));
    if (ui.columns.showTotalsColumn) {
      const overall = blockTotals.reduce((acc, entry) => acc + entry.raw, 0);
      totalsRow.push(
        formatMetricValue(overall, {
          rounding,
          abbreviate: ui.abbreviate,
          formatter: metricFormatter,
        }).display,
      );
    }
  }

  const headerY = margin;
  doc.setFontSize(18);
  doc.setTextColor(headerR, headerG, headerB);
  doc.text(`${plan.campaign.name} – Block Plan`, margin, headerY);
  doc.setFontSize(11);
  doc.setTextColor(secondaryR, secondaryG, secondaryB);
  doc.text(`Client: ${ui.brand.client ?? plan.campaign.brand}`, margin, headerY + 20);
  doc.text(`Date range: ${formatDateRange(plan.campaign.startDate, plan.campaign.endDate)}`, margin, headerY + 36);
  doc.text(`Currency: ${currencyCode}`, margin, headerY + 52);

  if (ui.brand.logoDataUrl && ui.brand.logoDataUrl.startsWith('data:image/')) {
    try {
      const logoType = ui.brand.logoDataUrl.substring(5, ui.brand.logoDataUrl.indexOf(';'));
      const format = logoType.split('/')[1]?.toUpperCase();
      if (format && format !== 'SVG+XML') {
        doc.addImage(ui.brand.logoDataUrl, format as 'PNG' | 'JPEG' | 'WEBP', doc.internal.pageSize.getWidth() - margin - 96, margin - 8, 96, 32);
      }
    } catch (error) {
      // Ignore logo failures to avoid blocking export.
      console.warn('Unable to embed logo in PDF export', error);
    }
  }

  const startY = headerY + 80;
  const rowStyle = rowStyleMap[ui.layout.rowHeight ?? 'normal'];

  autoTable(doc, {
    head: [tableHeader],
    body: tableBody,
    startY,
    margin: { left: margin, right: margin },
    styles: { fontSize: rowStyle.fontSize, cellPadding: rowStyle.cellPadding },
    headStyles: { fillColor: [headerR, headerG, headerB], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    foot: totalsRow ? [totalsRow] : undefined,
    footStyles: { fillColor: [headerR, headerG, headerB], textColor: 255, fontStyle: 'bold' },
    didDrawPage: (data) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      if (ui.brand.footer) {
        doc.text(ui.brand.footer, margin, pageHeight - 20);
      }
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
    },
  });

  if (ui.includeWarningsPage && warnings.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(headerR, headerG, headerB);
    doc.text('Pacing & Policy Warnings', margin, margin);
    doc.setFontSize(10);
    doc.setTextColor(secondaryR, secondaryG, secondaryB);
    const start = margin + 20;
    warnings.forEach((warning, index) => {
      const y = start + index * 18;
      doc.text(`${index + 1}. [${warningSeverityLabel[warning.severity]}] ${warning.message}`, margin, y);
      if (warning.tacticId) {
        doc.text(`Tactic: ${warning.tacticId}`, margin, y + 12);
      }
    });
  }

  const blob = doc.output('blob');
  const fileName = buildExportFileName(plan, 'pdf');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
