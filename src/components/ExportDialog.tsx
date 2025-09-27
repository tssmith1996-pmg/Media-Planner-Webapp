import { Fragment, useMemo, useState } from 'react';
import type { Channel, Plan } from '@/lib/schemas';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { blockPlanTemplates } from '@/exporters/blockPlan/templates';
import { buildPdf } from '@/exporters/blockPlan/pdf';
import { buildExcelWorkbook } from '@/exporters/blockPlan/excel';
import { exportFilename } from '@/exporters/blockPlan/common';
import { enumerateWeeks, formatDateRange, toIsoDate } from '@/lib/date';
import { currencyFormatter } from '@/lib/formatters';
import clsx from 'clsx';

function downloadBlob(filename: string, blob: Blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

type BlockPlanRow = {
  lineItemId: string;
  channel: Channel;
  label: string;
  flightRange: string;
  activeWeeks: Set<string>;
  startTimestamp: number;
  totalCost: number;
};

function BlockPlanMatrix({ plan }: { plan: Plan }) {
  const { weeks, groups } = useMemo(() => buildBlockPlan(plan), [plan]);

  if (weeks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        No flightings scheduled yet. Add line items to populate the block plan preview.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Block plan preview</h3>
          <p className="text-xs text-slate-500">Weeks run Sunday through Saturday. Highlighted cells indicate planned activity.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {weeks.length} weeks
        </div>
      </div>
      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="min-w-full border-collapse text-xs text-slate-700">
          <thead className="bg-slate-100 text-[0.7rem] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-64 px-3 py-2 text-left">Channel / Flight</th>
              {weeks.map((week) => (
                <th key={week.key} className="px-3 py-2 text-center font-medium">
                  {formatDateRange(toIsoDate(week.start), toIsoDate(week.end))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(groups.entries()).map(([channel, rows]) => {
              const channelTotal = rows.reduce((sum, row) => sum + row.totalCost, 0);
              return (
                <Fragment key={channel}>
                  <tr className="bg-slate-50">
                    <th colSpan={weeks.length + 1} className="px-3 py-2 text-left text-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{channel.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-slate-500">
                          {currencyFormatter.format(channelTotal)} planned
                        </span>
                      </div>
                    </th>
                  </tr>
                  {rows.map((row) => (
                    <tr key={row.lineItemId} className="border-b border-slate-100">
                      <th className="bg-white px-3 py-2 text-left font-medium text-slate-700">
                        <div className="space-y-1">
                          <span>{row.label}</span>
                          <span className="block text-[0.7rem] text-slate-500">{row.flightRange}</span>
                        </div>
                      </th>
                      {weeks.map((week) => {
                        const active = row.activeWeeks.has(week.key);
                        const cellLabel = `${row.label} ${active ? 'in market' : 'dark'} ${formatDateRange(
                          toIsoDate(week.start),
                          toIsoDate(week.end),
                        )}`;
                        return (
                          <td
                            key={`${row.lineItemId}-${week.key}`}
                            className={clsx('px-3 py-2 text-center align-middle', {
                              'bg-indigo-100 font-semibold text-indigo-900': active,
                              'text-slate-400': !active,
                            })}
                            aria-label={cellLabel}
                          >
                            {active ? '●' : '–'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildBlockPlan(plan: Plan) {
  const flightsById = new Map(plan.flights.map((flight) => [flight.flight_id, flight]));
  const vendorsById = new Map(plan.vendors.map((vendor) => [vendor.vendor_id, vendor]));

  let earliest: string | null = null;
  let latest: string | null = null;

  const rows: BlockPlanRow[] = [];

  for (const item of plan.lineItems) {
    const flight = flightsById.get(item.flight_id);
    if (!flight) continue;

    const periods =
      flight.active_periods_json && flight.active_periods_json.length > 0
        ? flight.active_periods_json
        : [{ start: flight.start_date, end: flight.end_date }];

    for (const period of periods) {
      if (!earliest || new Date(period.start) < new Date(earliest)) {
        earliest = period.start;
      }
      if (!latest || new Date(period.end) > new Date(latest)) {
        latest = period.end;
      }
    }

    const activeWeeks = new Set<string>();
    periods.forEach((period) => {
      enumerateWeeks(new Date(period.start), new Date(period.end)).forEach((week) => {
        activeWeeks.add(week.key);
      });
    });

    rows.push({
      lineItemId: item.line_item_id,
      channel: item.channel,
      label: vendorsById.get(item.vendor_id)?.name ?? item.line_item_id,
      flightRange: formatDateRange(flight.start_date, flight.end_date),
      activeWeeks,
      startTimestamp: new Date(flight.start_date).getTime(),
      totalCost: item.cost_planned,
    });
  }

  if (!earliest || !latest) {
    return { weeks: [] as ReturnType<typeof enumerateWeeks>, groups: new Map<Channel, BlockPlanRow[]>() };
  }

  const weeks = enumerateWeeks(new Date(earliest), new Date(latest));
  const groups = new Map<Channel, BlockPlanRow[]>();

  for (const row of rows) {
    const bucket = groups.get(row.channel) ?? [];
    bucket.push(row);
    groups.set(row.channel, bucket);
  }

  groups.forEach((list, channel) => {
    list.sort((a, b) => a.startTimestamp - b.startTimestamp);
    groups.set(channel, list);
  });

  return { weeks, groups };
}

export function ExportDialog({ plan, open, onClose }: { plan: Plan; open: boolean; onClose: () => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof blockPlanTemplates)[number]>(
    blockPlanTemplates[0],
  );
  const [busy, setBusy] = useState(false);

  const handleExport = async (type: 'pdf' | 'xlsx') => {
    try {
      setBusy(true);
      if (type === 'pdf') {
        const blob = await buildPdf(plan);
        downloadBlob(exportFilename(plan, 'pdf'), blob);
      } else {
        const blob = await buildExcelWorkbook(plan);
        downloadBlob(exportFilename(plan, 'xlsx'), blob);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Block Plan"
      description="Choose a template and format to export the latest plan."
      footer={
        <div className="flex justify-between gap-2">
          <div className="text-xs text-slate-500">Template: {selectedTemplate.name}</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button disabled={busy} onClick={() => handleExport('pdf')}>
              Export PDF
            </Button>
            <Button disabled={busy} variant="secondary" onClick={() => handleExport('xlsx')}>
              Export XLSX
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-slate-600">
          Plan exports include status, approver, pacing warnings, and a block plan matrix. Draft plans include a watermark.
        </p>
        <BlockPlanMatrix plan={plan} />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">Export templates</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {blockPlanTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplate(template)}
                className={clsx(
                  'rounded-lg border p-3 text-left text-sm shadow-sm transition hover:border-indigo-400',
                  selectedTemplate.id === template.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white',
                )}
              >
                <div className="font-semibold text-slate-700">{template.name}</div>
                <div className="mt-1 text-xs text-slate-500">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
