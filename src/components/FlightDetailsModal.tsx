import { formatDate, formatDateRange } from '@/lib/date';
import { currencyFormatter, numberFormatter } from '@/lib/formatters';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import type { ChannelFlighting } from '@/api/plans';
import { extensionKeyByChannel } from '@/lib/channelExtensions';

type FlightDetailsModalProps = {
  flighting: ChannelFlighting | null;
  open: boolean;
  onClose: () => void;
};

type Row = { label: string; value: string };

type Section = { title: string; rows: Row[] };

export function FlightDetailsModal({ flighting, open, onClose }: FlightDetailsModalProps) {
  if (!flighting || !flighting.lineItem) {
    return null;
  }

  const { lineItem, flight, vendor, audience, tracking, creative } = flighting;
  const extensionKey = extensionKeyByChannel[lineItem.channel];
  const extension = extensionKey
    ? (lineItem[extensionKey] as Record<string, unknown> | undefined)
    : undefined;

  const core: Row[] = compact([
    { label: 'Line item ID', value: lineItem.line_item_id },
    { label: 'Channel', value: lineItem.channel.replace(/_/g, ' ') },
    vendor?.name ? { label: 'Vendor', value: vendor.name } : null,
    creative?.ad_name ? { label: 'Creative', value: creative.ad_name } : null,
    flight
      ? {
          label: 'Flight window',
          value: `${formatDate(flight.start_date)} – ${formatDate(flight.end_date)}`,
        }
      : null,
    flight?.active_periods_json?.length
      ? {
          label: 'Active periods',
          value: flight.active_periods_json
            .map((period) => formatDateRange(period.start, period.end))
            .join(', '),
        }
      : null,
    { label: 'Planned cost', value: currencyFormatter.format(lineItem.cost_planned) },
  ]);

  const targeting: Row[] = compact([
    audience?.definition ? { label: 'Audience', value: audience.definition } : null,
    audience?.geo ? { label: 'Geography', value: audience.geo } : null,
    lineItem.goal_type ? { label: 'Goal type', value: lineItem.goal_type.replace(/_/g, ' ') } : null,
  ]);

  const buying: Row[] = compact([
    { label: 'Pricing model', value: lineItem.pricing_model },
    {
      label: 'Rate',
      value: formatRate(lineItem.rate_numeric, lineItem.rate_unit),
    },
    { label: 'Units planned', value: numberFormatter.format(lineItem.units_planned) },
    lineItem.pacing ? { label: 'Pacing', value: lineItem.pacing } : null,
  ]);

  const trackingRows: Row[] = compact([
    tracking?.ad_server ? { label: 'Ad server', value: tracking.ad_server } : null,
    tracking?.verification_vendor
      ? { label: 'Verification', value: tracking.verification_vendor }
      : null,
    tracking?.conversion_source
      ? { label: 'Conversion source', value: tracking.conversion_source }
      : null,
    lineItem.notes ? { label: 'Notes', value: lineItem.notes } : null,
  ]);

  const extensionRows: Row[] = extension
    ? Object.entries(extension).map(([key, value]) => ({
        label: startCase(key.replace(/_ext$/, '')),
        value: formatValue(value),
      }))
    : [];

  const sections: Section[] = [
    { title: 'Core', rows: core },
    { title: 'Targeting', rows: targeting },
    { title: 'Buying & Units', rows: buying },
    { title: 'Tracking & Notes', rows: trackingRows },
  ];

  if (extensionRows.length > 0) {
    sections.push({ title: 'Channel extension', rows: extensionRows });
  }

  return (
    <Modal
      title={`${lineItem.channel.replace(/_/g, ' ')} flighting details`}
      description="Review the structured payload powering this placement."
      open={open}
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-6">
        {sections.map((section) =>
          section.rows.length > 0 ? (
            <section key={section.title} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">{section.title}</h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {section.rows.map((row) => (
                  <div key={`${section.title}-${row.label}`} className="space-y-1">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">{row.label}</dt>
                    <dd className="text-slate-900">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null,
        )}
      </div>
    </Modal>
  );
}

function compact<T>(items: (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item != null);
}

function formatRate(rate: number, unit: string) {
  if (Number.isNaN(rate)) return '—';
  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 2,
  });
  const formatted = formatter.format(rate);
  return `${formatted} ${unit}`;
}

function startCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return numberFormatter.format(value);
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return formatDate(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => formatValue(entry)).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${startCase(key)}: ${formatValue(entry)}`)
      .join('; ');
  }
  return String(value);
}
