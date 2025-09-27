import { Fragment, useMemo, useState } from 'react';
import type { LineItem, Plan } from '@/lib/schemas';
import { Table, THead, TBody, Th, Td } from '@/ui/Table';
import { currencyFormatter, numberFormatter } from '@/lib/formatters';
import { formatDateRange } from '@/lib/date';
import { flags } from '@/app/featureFlags';

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return numberFormatter.format(value);
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

function getExtension(lineItem: LineItem) {
  return (
    lineItem.ooh_ext ??
    lineItem.tv_ext ??
    lineItem.bvod_ext ??
    lineItem.digital_ext ??
    lineItem.social_ext ??
    lineItem.search_ext ??
    lineItem.audio_ext ??
    lineItem.podcast_ext ??
    lineItem.cinema_ext ??
    lineItem.print_ext ??
    lineItem.retail_media_ext ??
    lineItem.influencer_ext ??
    lineItem.sponsorship_ext ??
    lineItem.email_dm_ext ??
    lineItem.gaming_native_ext ??
    lineItem.affiliate_ext ??
    undefined
  );
}

function LineItemDetails({ plan, lineItem }: { plan: Plan; lineItem: LineItem }) {
  const flight = plan.flights.find((item) => item.flight_id === lineItem.flight_id);
  const campaign = flight ? plan.campaigns.find((item) => item.campaign_id === flight.campaign_id) : undefined;
  const audience = plan.audiences.find((item) => item.audience_id === lineItem.audience_id);
  const vendor = plan.vendors.find((item) => item.vendor_id === lineItem.vendor_id);
  const creative = plan.creatives.find((item) => item.creative_id === lineItem.creative_id);
  const tracking = plan.tracking.find((item) => item.line_item_id === lineItem.line_item_id);
  const actuals = useMemo(
    () => plan.deliveryActuals.filter((item) => item.line_item_id === lineItem.line_item_id),
    [plan.deliveryActuals, lineItem.line_item_id],
  );
  const extension = getExtension(lineItem);

  const extensionEntries = extension ? Object.entries(extension).map(([key, value]) => [key, formatValue(value)]) : [];

  const totals = actuals.reduce(
    (acc, row) => ({
      impressions: acc.impressions + (row.impressions ?? 0),
      clicks: acc.clicks + (row.clicks ?? 0),
      conversions: acc.conversions + (row.conversions ?? 0),
      cost: acc.cost + (row.actual_cost ?? 0),
    }),
    { impressions: 0, clicks: 0, conversions: 0, cost: 0 },
  );

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Campaign</p>
          <p className="font-medium text-slate-800">{campaign?.brand ?? '—'}</p>
          <p className="text-xs text-slate-500">{campaign?.objective ?? 'No objective recorded'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Audience</p>
          <p className="font-medium text-slate-800">{audience?.definition ?? '—'}</p>
          <p className="text-xs text-slate-500">Segments: {formatValue(audience?.segments_json)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Creative</p>
          <p className="font-medium text-slate-800">{creative?.ad_name ?? '—'}</p>
          <p className="text-xs text-slate-500">Format: {creative?.format ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Vendor Contact</p>
          <p className="font-medium text-slate-800">{vendor?.name ?? '—'}</p>
          <p className="text-xs text-slate-500">{formatValue(vendor?.contact_json)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Tracking</p>
          <p className="font-medium text-slate-800">{tracking?.ad_server ?? '—'}</p>
          <p className="text-xs text-slate-500">Verification: {tracking?.verification_vendor ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Actuals (to date)</p>
          <p className="font-medium text-slate-800">
            {numberFormatter.format(totals.impressions)} imp • {numberFormatter.format(totals.clicks)} clicks
          </p>
          <p className="text-xs text-slate-500">
            {numberFormatter.format(totals.conversions)} conv • {currencyFormatter.format(totals.cost)} cost
          </p>
        </div>
      </div>
      {extensionEntries.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Channel Details</p>
          <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {extensionEntries.map(([key, value]) => (
              <div key={key} className="rounded border border-slate-200 bg-white p-2">
                <dt className="text-xs uppercase tracking-wide text-slate-400">{key.replace(/_/g, ' ')}</dt>
                <dd className="text-sm font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

export function ChannelTable({ plan }: { plan: Plan; readOnly?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const enableDetails = flags.mediaModelV1;

  const toggle = (id: string) => {
    if (!enableDetails) return;
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <Table>
      <THead>
        <tr>
          <Th>Line Item</Th>
          <Th>Campaign</Th>
          <Th>Flight</Th>
          <Th>Channel</Th>
          <Th>Vendor</Th>
          <Th>Pricing</Th>
          <Th align="right">Units Planned</Th>
          <Th align="right">Planned Cost</Th>
        </tr>
      </THead>
      <TBody>
        {plan.lineItems.map((lineItem) => {
          const flight = plan.flights.find((item) => item.flight_id === lineItem.flight_id);
          const campaign = flight
            ? plan.campaigns.find((item) => item.campaign_id === flight.campaign_id)
            : undefined;
          const vendor = plan.vendors.find((item) => item.vendor_id === lineItem.vendor_id);
          const creative = plan.creatives.find((item) => item.creative_id === lineItem.creative_id);
          const isExpanded = expandedId === lineItem.line_item_id;

          return (
            <Fragment key={lineItem.line_item_id}>
              <tr key={lineItem.line_item_id} className="bg-white hover:bg-slate-50">
                <Td>
                  {enableDetails ? (
                    <button
                      type="button"
                      onClick={() => toggle(lineItem.line_item_id)}
                      className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-slate-800"
                    >
                      <span>{creative?.ad_name ?? lineItem.line_item_id}</span>
                      <span className="text-xs text-indigo-600">{isExpanded ? 'Hide' : 'View'} details</span>
                    </button>
                  ) : (
                    <span className="text-sm font-medium text-slate-800">{creative?.ad_name ?? lineItem.line_item_id}</span>
                  )}
                </Td>
                <Td>{campaign?.brand ?? '—'}</Td>
                <Td>{flight ? formatDateRange(flight.start_date, flight.end_date) : '—'}</Td>
                <Td>{lineItem.channel}</Td>
                <Td>{vendor?.name ?? '—'}</Td>
                <Td>{`${lineItem.pricing_model} @ ${lineItem.rate_unit}`}</Td>
                <Td align="right">{numberFormatter.format(lineItem.units_planned)}</Td>
                <Td align="right">{currencyFormatter.format(lineItem.cost_planned)}</Td>
              </tr>
              {enableDetails && isExpanded ? (
                <tr>
                  <Td colSpan={8} className="bg-slate-50">
                    <LineItemDetails plan={plan} lineItem={lineItem} />
                  </Td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </TBody>
    </Table>
  );
}
