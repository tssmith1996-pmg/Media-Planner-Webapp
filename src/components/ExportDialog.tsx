import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Plan } from '../lib/schemas';
import type { PacingWarning } from './PacingWarnings';
import { buildBlockPlanMatrix, Timegrain } from '../exporters/blockPlan/common';
import { exportBlockPlanToExcel } from '../exporters/blockPlan/excel';
import { exportBlockPlanToPdf } from '../exporters/blockPlan/pdf';
import {
  ExportTemplateId,
  ExportUIOptions,
  exportTemplates,
  getTemplateDefaults,
  PdfRowHeight,
} from '../exporters/blockPlan/templates';
import { buildMetaColumns } from '../exporters/blockPlan/metaColumns';

const roundingOptions = [1, 10, 100, 1000] as const;

const exportSchema = z.object({
  format: z.enum(['xlsx', 'pdf']),
  template: z.enum(['ClientSimple', 'PMGStandard', 'DetailedTactic']),
  brand: z.object({
    client: z.string().optional(),
    logoDataUrl: z.string().optional(),
    primary: z.string().default('#0f172a'),
    secondary: z.string().default('#3b82f6'),
    footer: z.string().optional(),
  }),
  layout: z.object({
    groupBy: z.enum(['Channel', 'Tactic']),
    timegrain: z.enum(['Week', 'Fortnight', 'Month']),
    orientation: z.enum(['portrait', 'landscape']).optional(),
    rowHeight: z.enum(['compact', 'normal', 'comfy']).optional(),
    rangeStart: z.string().optional(),
    rangeEnd: z.string().optional(),
  }),
  columns: z.object({
    showChannel: z.boolean(),
    showVendor: z.boolean(),
    showBidType: z.boolean(),
    showBudget: z.boolean(),
    showImpressions: z.boolean(),
    showClicks: z.boolean(),
    showConversions: z.boolean(),
    showRoas: z.boolean(),
    showNotes: z.boolean(),
    showTotalsRow: z.boolean(),
    showTotalsColumn: z.boolean(),
  }),
  metric: z.enum(['Budget', 'Impressions', 'Clicks', 'Conversions']),
  rounding: z.union([z.literal(1), z.literal(10), z.literal(100), z.literal(1000)]),
  abbreviate: z.boolean(),
  currency: z.string().optional(),
  includeWarningsPage: z.boolean(),
  averageOrderValue: z.number().min(0).optional(),
});

export type ExportFormValues = z.infer<typeof exportSchema>;

type ExportDialogProps = {
  isOpen: boolean;
  onClose(): void;
  plan: Plan;
  warnings: PacingWarning[];
  averageOrderValue: number;
};

const rowsPerPageByHeight: Record<PdfRowHeight, number> = {
  compact: 30,
  normal: 22,
  comfy: 16,
};

const ExportDialog = ({ isOpen, onClose, plan, warnings, averageOrderValue }: ExportDialogProps): JSX.Element | null => {
  const defaultTemplate = getTemplateDefaults('PMGStandard', plan);
  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    mode: 'onChange',
    defaultValues: {
      ...defaultTemplate,
      format: defaultTemplate.format,
      template: 'PMGStandard',
      layout: {
        ...defaultTemplate.layout,
        rangeStart: plan.campaign.startDate,
        rangeEnd: plan.campaign.endDate,
      },
      columns: defaultTemplate.columns,
      currency: defaultTemplate.currency,
      abbreviate: defaultTemplate.abbreviate,
      includeWarningsPage: defaultTemplate.includeWarningsPage,
      averageOrderValue: defaultTemplate.averageOrderValue ?? averageOrderValue,
    },
  });

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        ...defaultTemplate,
        format: defaultTemplate.format,
        template: 'PMGStandard',
        layout: {
          ...defaultTemplate.layout,
          rangeStart: plan.campaign.startDate,
          rangeEnd: plan.campaign.endDate,
        },
        columns: defaultTemplate.columns,
        currency: defaultTemplate.currency,
        abbreviate: defaultTemplate.abbreviate,
        includeWarningsPage: defaultTemplate.includeWarningsPage,
        averageOrderValue: defaultTemplate.averageOrderValue ?? averageOrderValue,
      });
    }
  }, [isOpen, form, defaultTemplate, plan, averageOrderValue]);

  const selectedTemplate = form.watch('template');

  useEffect(() => {
    const nextDefaults = getTemplateDefaults(selectedTemplate, plan);
    form.reset({
      ...nextDefaults,
      format: nextDefaults.format,
      template: selectedTemplate,
      layout: {
        ...nextDefaults.layout,
        rangeStart: form.getValues('layout.rangeStart') ?? plan.campaign.startDate,
        rangeEnd: form.getValues('layout.rangeEnd') ?? plan.campaign.endDate,
      },
      columns: nextDefaults.columns,
      currency: nextDefaults.currency,
      abbreviate: nextDefaults.abbreviate,
      includeWarningsPage: nextDefaults.includeWarningsPage,
      averageOrderValue: nextDefaults.averageOrderValue ?? averageOrderValue,
      brand: {
        ...nextDefaults.brand,
        logoDataUrl: form.getValues('brand.logoDataUrl'),
      },
    });
  }, [selectedTemplate, form, plan, averageOrderValue]);

  if (!isOpen) {
    return null;
  }

  const timegrain = form.watch('layout.timegrain');
  const rangeStart = form.watch('layout.rangeStart');
  const rangeEnd = form.watch('layout.rangeEnd');
  const groupBy = form.watch('layout.groupBy');
  const metric = form.watch('metric');
  const format = form.watch('format');
  const includeWarningsPage = form.watch('includeWarningsPage');
  const abbreviate = form.watch('abbreviate');
  const rounding = form.watch('rounding');
  const currency = form.watch('currency') ?? plan.campaign.currency;
  const brand = form.watch('brand') as ExportUIOptions['brand'];
  const columns = form.watch('columns') as ExportUIOptions['columns'];
  const orientation = form.watch('layout.orientation');
  const rowHeightValue = (form.watch('layout.rowHeight') as PdfRowHeight | undefined) ?? 'normal';
  const averageOrderValueFormValue = form.watch('averageOrderValue');
  const averageOrderValueField = Number.isFinite(averageOrderValueFormValue)
    ? (averageOrderValueFormValue as number)
    : averageOrderValue;
  const previewMatrix = useMemo(
    () =>
      buildBlockPlanMatrix(plan, {
        groupBy,
        metric,
        timegrain: timegrain as Timegrain,
        rangeStart: rangeStart || plan.campaign.startDate,
        rangeEnd: rangeEnd || plan.campaign.endDate,
      }),
    [plan, groupBy, metric, timegrain, rangeStart, rangeEnd],
  );

  const previewOptions = useMemo<ExportUIOptions>(
    () => ({
      format,
      template: selectedTemplate as ExportTemplateId,
      brand: {
        client: brand?.client,
        logoDataUrl: brand?.logoDataUrl,
        primary: brand?.primary ?? '#0f172a',
        secondary: brand?.secondary ?? '#3b82f6',
        footer: brand?.footer,
      },
      layout: {
        groupBy,
        timegrain: timegrain as Timegrain,
        orientation: orientation ?? (format === 'pdf' ? 'landscape' : undefined),
        rowHeight: rowHeightValue,
        rangeStart: rangeStart ?? plan.campaign.startDate,
        rangeEnd: rangeEnd ?? plan.campaign.endDate,
      },
      columns,
      metric,
      rounding,
      abbreviate,
      currency,
      includeWarningsPage,
      averageOrderValue: averageOrderValueField,
    }),
    [
      format,
      selectedTemplate,
      brand,
      groupBy,
      timegrain,
      orientation,
      rowHeightValue,
      rangeStart,
      rangeEnd,
      columns,
      metric,
      rounding,
      abbreviate,
      currency,
      includeWarningsPage,
      averageOrderValueField,
      plan.campaign.startDate,
      plan.campaign.endDate,
    ],
  );

  const previewMetaColumns = useMemo(
    () => buildMetaColumns(previewMatrix, previewOptions, previewOptions.averageOrderValue ?? averageOrderValue),
    [previewMatrix, previewOptions, averageOrderValue],
  );

  const totalColumns = previewMetaColumns.length + previewMatrix.columns.length + (previewOptions.columns.showTotalsColumn ? 1 : 0);
  const totalRows = previewMatrix.rows.length + (previewOptions.columns.showTotalsRow ? 1 : 0);
  const estimatedPages = format === 'pdf'
    ? Math.max(1, Math.ceil(totalRows / rowsPerPageByHeight[previewOptions.layout.rowHeight ?? 'normal'])) +
      (previewOptions.includeWarningsPage && warnings.length > 0 ? 1 : 0)
    : 1;
  const totalsRowLabel = previewOptions.columns.showTotalsRow ? 'Row' : '—';
  const totalsColumnLabel = previewOptions.columns.showTotalsColumn ? 'Column' : '—';
  const displayCurrency = previewOptions.currency ?? plan.campaign.currency;

  const onSubmit = async (values: ExportFormValues) => {
    setIsExporting(true);
    try {
      const matrix = buildBlockPlanMatrix(plan, {
        groupBy: values.layout.groupBy,
        metric: values.metric,
        timegrain: values.layout.timegrain,
        rangeStart: values.layout.rangeStart,
        rangeEnd: values.layout.rangeEnd,
      });
      const options: ExportUIOptions = {
        ...values,
        brand: values.brand,
        layout: {
          ...values.layout,
          orientation: values.layout.orientation ?? (values.format === 'pdf' ? 'landscape' : undefined),
          rowHeight: values.layout.rowHeight ?? 'normal',
        },
        columns: values.columns,
        currency: values.currency ?? plan.campaign.currency,
        averageOrderValue: values.averageOrderValue ?? averageOrderValue,
      };
      if (values.format === 'xlsx') {
        await exportBlockPlanToExcel(matrix, plan, options);
      } else {
        await exportBlockPlanToPdf(matrix, plan, options, warnings);
      }
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      form.setValue('brand.logoDataUrl', reader.result as string, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Export block plan</h2>
            <p className="text-xs text-slate-500">
              Columns: {totalColumns} · Rows: {totalRows} · Estimated pages: {estimatedPages}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close export dialog">
            ✕
          </button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 px-6 py-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Format</h3>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <label className="flex items-center gap-2">
                  <input type="radio" value="xlsx" {...form.register('format')} /> Excel (.xlsx)
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" value="pdf" {...form.register('format')} /> PDF
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Template</h3>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                {...form.register('template')}
              >
                {exportTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label} — {template.description}
                  </option>
                ))}
              </select>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branding</h4>
                <div className="mt-2 space-y-3 text-sm">
                  <label className="block">
                    <span className="text-xs text-slate-500">Client name</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                      {...form.register('brand.client')}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-slate-500">Primary color</span>
                      <input type="color" className="mt-1 h-10 w-full" {...form.register('brand.primary')} />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-500">Secondary color</span>
                      <input type="color" className="mt-1 h-10 w-full" {...form.register('brand.secondary')} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs text-slate-500">Footer text</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                      {...form.register('brand.footer')}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">Logo (PNG/SVG)</span>
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="mt-1 w-full text-xs" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Layout</h4>
                <div className="mt-2 grid gap-3 text-sm">
                  <label className="block">
                    <span className="text-xs text-slate-500">Group by</span>
                    <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...form.register('layout.groupBy')}>
                      <option value="Channel">Channel</option>
                      <option value="Tactic">Tactic</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">Timegrain</span>
                    <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...form.register('layout.timegrain')}>
                      <option value="Week">Week</option>
                      <option value="Fortnight">Fortnight</option>
                      <option value="Month">Month</option>
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs text-slate-500">
                      Date start
                      <input
                        type="date"
                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                        {...form.register('layout.rangeStart')}
                      />
                    </label>
                    <label className="block text-xs text-slate-500">
                      Date end
                      <input
                        type="date"
                        className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                        {...form.register('layout.rangeEnd')}
                      />
                    </label>
                  </div>
                  {format === 'pdf' && (
                    <>
                      <label className="block">
                        <span className="text-xs text-slate-500">Orientation</span>
                        <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...form.register('layout.orientation')}>
                          <option value="landscape">Landscape</option>
                          <option value="portrait">Portrait</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-500">Row height</span>
                        <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...form.register('layout.rowHeight')}>
                          <option value="compact">Compact</option>
                          <option value="normal">Normal</option>
                          <option value="comfy">Comfy</option>
                        </select>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Columns & Metrics</h4>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showChannel')} /> Show channel column
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showVendor')} /> Show vendor
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showBidType')} /> Show bid type
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showBudget')} /> Show budget
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showImpressions')} /> Show impressions
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showClicks')} /> Show clicks
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showConversions')} /> Show conversions
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showRoas')} /> Show ROAS
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showNotes')} /> Show notes
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showTotalsRow')} /> Totals row
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...form.register('columns.showTotalsColumn')} /> Totals column
                </label>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <label className="block">
                  <span className="text-xs text-slate-500">Block metric</span>
                  <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...form.register('metric')}>
                    <option value="Budget">Budget</option>
                    <option value="Impressions">Impressions</option>
                    <option value="Clicks">Clicks</option>
                    <option value="Conversions">Conversions</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500">Currency override</span>
                  <input
                    type="text"
                    placeholder={plan.campaign.currency}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    {...form.register('currency')}
                  />
                </label>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Display</h4>
                <label className="block">
                  <span className="text-xs text-slate-500">Rounding</span>
                  <select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" {...form.register('rounding')}>
                    {roundingOptions.map((option) => (
                      <option key={option} value={option}>
                        Nearest {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...form.register('abbreviate')} /> Abbreviate big numbers (K/M)
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500">Average order value</span>
                  <input
                    type="number"
                    step="1"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                    {...form.register('averageOrderValue', { valueAsNumber: true })}
                  />
                </label>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policy</h4>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...form.register('includeWarningsPage')} /> Include pacing warnings page
                </label>
                <p className="text-xs text-slate-500">
                  {warnings.length} warnings detected in current plan. Enabling the summary adds a dedicated page.
                </p>
              </div>
            </section>
          </div>

          <aside className="flex h-full flex-col justify-between gap-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">Preview summary</h4>
              <dl className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <dt>Timegrain</dt>
                  <dd className="font-medium text-slate-900">{timegrain}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Grouping</dt>
                  <dd className="font-medium text-slate-900">{groupBy}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Metric</dt>
                  <dd className="font-medium text-slate-900">{metric}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Currency</dt>
                  <dd className="font-medium text-slate-900">{displayCurrency}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Totals</dt>
                  <dd className="font-medium text-slate-900">{totalsRowLabel} / {totalsColumnLabel}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Rounding</dt>
                  <dd className="font-medium text-slate-900">Nearest {rounding}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Abbreviate</dt>
                  <dd className="font-medium text-slate-900">{abbreviate ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                disabled={isExporting}
              >
                {isExporting ? 'Preparing export…' : format === 'xlsx' ? 'Export Excel' : 'Export PDF'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default ExportDialog;
