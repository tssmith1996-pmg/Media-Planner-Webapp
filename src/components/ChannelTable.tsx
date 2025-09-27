import { Fragment, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import type { Channel, Flight, Plan } from '@/lib/schemas';
import { channelEnum } from '@/lib/schemas';
import { Table, THead, TBody, Th, Td } from '@/ui/Table';
import { Select } from '@/ui/Select';
import { Button } from '@/ui/Button';
import { currencyFormatter, numberFormatter, percentFormatter } from '@/lib/formatters';
import { formatDate } from '@/lib/date';
import { getChannelExtension } from '@/lib/channelExtensions';
import { useChannelFlightings, useMutatePlan, type ChannelFlighting } from '@/api/plans';
import clsx from 'clsx';
import { FlightDetailsModal } from './FlightDetailsModal';
import { addChannelDraft } from '@/lib/planBuilders';
import { AddChannelDialog } from './dialogs/AddChannelDialog';
import { FlightingScheduleDialog } from './dialogs/FlightingScheduleDialog';

type ChannelSummary = {
  channel: Channel;
  totalCost: number;
  startDate: string | null;
  endDate: string | null;
};

type ChannelTableProps = {
  plan: Plan;
  readOnly?: boolean;
  onChannelChange?: (current: Channel, next: Channel) => void;
};

type SortKey = 'startDate' | 'endDate' | 'totalCost';
type SortDirection = 'asc' | 'desc';

type ColumnConfig = {
  id: string;
  label: string;
  render: (data: ChannelFlighting) => ReactNode;
  align?: 'left' | 'right' | 'center';
};

function getColumnsForChannel(channel: Channel): ColumnConfig[] {
  return [
    {
      id: 'vendor',
      label: 'Vendor',
      render: ({ vendor }) => vendor?.name ?? '—',
    },
    {
      id: 'placement-detail',
      label: placementLabel(channel),
      render: (row) => formatPlacementDetail(channel, row),
    },
    {
      id: 'objective',
      label: 'Objective',
      render: (row) => formatObjective(channel, row),
    },
    {
      id: 'units',
      label: 'Units planned',
      render: (row) => formatUnits(channel, row),
      align: 'right',
    },
    {
      id: 'cost',
      label: 'Cost',
      render: ({ lineItem }) => currencyFormatter.format(lineItem.cost_planned),
      align: 'right',
    },
    {
      id: 'fees',
      label: 'Fees',
      render: (row) => formatFees(row),
      align: 'right',
    },
  ];
}

function placementLabel(channel: Channel) {
  switch (channel) {
    case 'TV':
    case 'Radio':
    case 'Streaming_Audio':
    case 'Cinema':
      return 'Spot length';
    case 'OOH':
    case 'Print':
    case 'Direct_Mail':
      return 'Ad size';
    case 'Retail_Media':
      return 'Format';
    case 'Social':
      return 'Ad format';
    case 'Digital_Display':
    case 'Digital_Video':
    case 'Gaming':
    case 'Native':
      return 'Placement';
    case 'Search':
      return 'Campaign type';
    case 'Email':
      return 'Send platform';
    case 'Podcast':
      return 'Show';
    case 'Influencer':
      return 'Creator';
    case 'Sponsorship':
    case 'Experiential':
      return 'Property';
    case 'BVOD_CTV':
      return 'Platform';
    case 'Affiliate':
      return 'Network';
    default:
      return 'Placement detail';
  }
}

function formatPlacementDetail(channel: Channel, row: ChannelFlighting): string {
  const { lineItem, creative } = row;
  const extension = getChannelExtension(lineItem);

  switch (channel) {
    case 'TV':
      return lineItem.tv_ext?.spot_length_sec
        ? `${lineItem.tv_ext.spot_length_sec}s`
        : '—';
    case 'Radio':
    case 'Streaming_Audio':
      return lineItem.audio_ext?.spot_len_sec
        ? `${lineItem.audio_ext.spot_len_sec}s`
        : '—';
    case 'Cinema':
      return lineItem.cinema_ext?.spot_len_sec
        ? `${lineItem.cinema_ext.spot_len_sec}s`
        : '—';
    case 'OOH':
      return lineItem.ooh_ext?.format ?? '—';
    case 'Print':
      return lineItem.print_ext?.ad_size ?? lineItem.print_ext?.dimensions ?? '—';
    case 'Direct_Mail':
      return lineItem.email_dm_ext?.print_specs ?? lineItem.email_dm_ext?.list_source ?? '—';
    case 'Retail_Media':
      return (
        lineItem.retail_media_ext?.onsite_format ??
        lineItem.retail_media_ext?.offsite_format ??
        '—'
      );
    case 'Social':
      return (
        lineItem.social_ext?.ad_format ??
        lineItem.social_ext?.placements_json?.join(', ') ??
        '—'
      );
    case 'Digital_Display':
    case 'Digital_Video':
      return (
        lineItem.digital_ext?.creative_sizes_json?.join(', ') ??
        lineItem.digital_ext?.inventory_type ??
        '—'
      );
    case 'Search':
      return lineItem.search_ext?.campaign_type ?? '—';
    case 'Email':
      return lineItem.email_dm_ext?.send_platform ?? '—';
    case 'Podcast':
      return lineItem.podcast_ext?.show ?? '—';
    case 'Influencer':
      return lineItem.influencer_ext?.creator_handle ?? '—';
    case 'Sponsorship':
    case 'Experiential':
      return lineItem.sponsorship_ext?.property ?? '—';
    case 'BVOD_CTV':
      return lineItem.bvod_ext?.platform ?? '—';
    case 'Gaming':
    case 'Native':
      return lineItem.gaming_native_ext?.ad_format ?? lineItem.gaming_native_ext?.title_or_publisher ?? '—';
    case 'Affiliate':
      return lineItem.affiliate_ext?.network ?? '—';
    default:
      if (typeof extension === 'object' && extension) {
        const firstValue = Object.values(extension).find((value) => typeof value === 'string');
        if (typeof firstValue === 'string' && firstValue.trim().length > 0) {
          return firstValue;
        }
      }
      return creative?.format ?? '—';
  }
}

function formatObjective(channel: Channel, row: ChannelFlighting): string {
  const { lineItem, flight } = row;

  let value: string | undefined | null;

  switch (channel) {
    case 'TV':
      value = lineItem.tv_ext?.buy_unit ?? formatGoal(lineItem.goal_type);
      break;
    case 'Radio':
    case 'Streaming_Audio':
      value = lineItem.audio_ext?.daypart ?? formatGoal(lineItem.goal_type);
      break;
    case 'Cinema':
      value = lineItem.cinema_ext?.package_desc ?? formatGoal(lineItem.goal_type);
      break;
    case 'OOH':
      value = lineItem.ooh_ext?.environment ?? formatGoal(lineItem.goal_type);
      break;
    case 'Social':
      value = lineItem.social_ext?.objective ?? formatPricingModel(lineItem.pricing_model);
      break;
    case 'Digital_Display':
    case 'Digital_Video':
      value = lineItem.digital_ext?.buy_type ?? formatPricingModel(lineItem.pricing_model);
      break;
    case 'Search':
      value = lineItem.search_ext?.bidding_strategy ?? formatGoal(lineItem.goal_type);
      break;
    case 'Retail_Media':
      value = lineItem.retail_media_ext?.onsite_format
        ? `On-site ${lineItem.retail_media_ext.onsite_format}`
        : formatGoal(lineItem.goal_type);
      break;
    case 'Influencer':
      value = lineItem.influencer_ext?.usage_rights_window ?? formatGoal(lineItem.goal_type);
      break;
    case 'Sponsorship':
    case 'Experiential':
      value = lineItem.sponsorship_ext?.measurement_plan ?? formatGoal(lineItem.goal_type);
      break;
    case 'Podcast':
      value = lineItem.podcast_ext?.ad_position ?? formatGoal(lineItem.goal_type);
      break;
    case 'Email':
      value = lineItem.email_dm_ext?.response_tracking_method ?? formatGoal(lineItem.goal_type);
      break;
    case 'Direct_Mail':
      value = lineItem.email_dm_ext?.drop_date
        ? `Drop ${formatDate(lineItem.email_dm_ext.drop_date)}`
        : formatGoal(lineItem.goal_type);
      break;
    case 'Gaming':
    case 'Native':
      value = lineItem.gaming_native_ext?.subtype ?? formatGoal(lineItem.goal_type);
      break;
    case 'Affiliate':
      value = lineItem.affiliate_ext?.commission_model ?? formatPricingModel(lineItem.pricing_model);
      break;
    default:
      value = flight?.buy_type ?? formatGoal(lineItem.goal_type);
  }

  if (!value) {
    return '—';
  }

  return value;
}

function formatUnits(channel: Channel, row: ChannelFlighting): string {
  const { lineItem } = row;

  const channelSpecific = (() => {
    switch (channel) {
      case 'TV':
        return lineItem.tv_ext?.spot_count != null
          ? `${numberFormatter.format(lineItem.tv_ext.spot_count)} spots`
          : null;
      case 'Radio':
      case 'Streaming_Audio':
        return lineItem.audio_ext?.spots != null
          ? `${numberFormatter.format(lineItem.audio_ext.spots)} spots`
          : null;
      case 'Cinema':
        return lineItem.cinema_ext?.screen_count != null
          ? `${numberFormatter.format(lineItem.cinema_ext.screen_count)} screens`
          : null;
      case 'Print':
        return lineItem.print_ext?.print_run != null
          ? `${numberFormatter.format(lineItem.print_ext.print_run)} copies`
          : null;
      case 'OOH':
        return lineItem.ooh_ext?.weekly_imps != null
          ? `${numberFormatter.format(lineItem.ooh_ext.weekly_imps)} weekly imps`
          : null;
      case 'Retail_Media':
        return lineItem.retail_media_ext?.sales_window_days != null
          ? `${numberFormatter.format(lineItem.retail_media_ext.sales_window_days)} day window`
          : null;
      case 'Influencer':
        return lineItem.influencer_ext?.deliverables_json?.length
          ? `${numberFormatter.format(lineItem.influencer_ext.deliverables_json.length)} deliverables`
          : null;
      default:
        return null;
    }
  })();

  if (channelSpecific) {
    return channelSpecific;
  }

  const formattedUnits = numberFormatter.format(lineItem.units_planned);
  const goal = formatGoal(lineItem.goal_type);
  return goal ? `${formattedUnits} ${goal}` : formattedUnits;
}

function formatFees(row: ChannelFlighting): string {
  const totalFees = calculateFees(row);
  return totalFees > 0 ? currencyFormatter.format(totalFees) : '—';
}

function calculateFees({ lineItem }: ChannelFlighting): number {
  const extension = getChannelExtension(lineItem);
  if (!extension || typeof extension !== 'object') {
    return 0;
  }
  return collectNumericFees(extension as Record<string, unknown>);
}

function collectNumericFees(payload: Record<string, unknown>): number {
  return Object.entries(payload).reduce((total, [key, value]) => {
    if (typeof value === 'number' && /(_cost|_fee|commission)/i.test(key)) {
      return total + value;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return total + collectNumericFees(value as Record<string, unknown>);
    }
    return total;
  }, 0);
}

function resolveFlightStart(flight?: Flight | null): string | null {
  if (!flight) return null;
  const periods = flight.active_periods_json ?? [];
  if (periods.length === 0) {
    return flight.start_date;
  }
  const sorted = [...periods].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  return sorted[0]?.start ?? flight.start_date;
}

function resolveFlightEnd(flight?: Flight | null): string | null {
  if (!flight) return null;
  const periods = flight.active_periods_json ?? [];
  if (periods.length === 0) {
    return flight.end_date;
  }
  const sorted = [...periods].sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime());
  return sorted[sorted.length - 1]?.end ?? flight.end_date;
}

function formatGoal(goal?: string) {
  if (!goal) return '';
  return goal.replace(/_/g, ' ');
}

function formatPricingModel(model: string) {
  return model.replace(/_/g, ' ');
}

function buildChannelSummaries(plan: Plan): ChannelSummary[] {
  const flightsById = new Map(plan.flights.map((flight) => [flight.flight_id, flight]));
  const summaryMap = new Map<Channel, ChannelSummary>();

  for (const item of plan.lineItems) {
    const summary = summaryMap.get(item.channel) ?? {
      channel: item.channel,
      totalCost: 0,
      startDate: null,
      endDate: null,
    };

    const flight = flightsById.get(item.flight_id);
    summary.totalCost += item.cost_planned;

    if (flight) {
      const start = resolveFlightStart(flight);
      const end = resolveFlightEnd(flight);
      if (start) {
        summary.startDate = summary.startDate
          ? new Date(summary.startDate) <= new Date(start)
            ? summary.startDate
            : start
          : start;
      }
      if (end) {
        summary.endDate = summary.endDate
          ? new Date(summary.endDate) >= new Date(end)
            ? summary.endDate
            : end
          : end;
      }
    }

    summaryMap.set(item.channel, summary);
  }

  return Array.from(summaryMap.values());
}

function sortSummaries(rows: ChannelSummary[], key: SortKey, direction: SortDirection) {
  const sorted = [...rows].sort((a, b) => {
    const multiplier = direction === 'asc' ? 1 : -1;

    if (key === 'totalCost') {
      return (a.totalCost - b.totalCost) * multiplier;
    }

    const aDate = key === 'startDate' ? a.startDate : a.endDate;
    const bDate = key === 'startDate' ? b.startDate : b.endDate;
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1 * multiplier;
    if (!bDate) return -1 * multiplier;
    return (new Date(aDate).getTime() - new Date(bDate).getTime()) * multiplier;
  });

  return sorted;
}

export function ChannelTable({ plan, readOnly = false, onChannelChange }: ChannelTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('startDate');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const [expanded, setExpanded] = useState<Set<Channel>>(() => new Set());
  const [activeFlight, setActiveFlight] = useState<ChannelFlighting | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<ChannelFlighting | null>(null);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const scheduleTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mutatePlan = useMutatePlan();

  const summaries = useMemo(() => buildChannelSummaries(plan), [plan]);
  const sorted = useMemo(() => sortSummaries(summaries, sortKey, direction), [summaries, sortKey, direction]);
  const totalPlanCost = useMemo(
    () => plan.lineItems.reduce((total, item) => total + item.cost_planned, 0),
    [plan.lineItems],
  );
  const channelLabels = useMemo(() => {
    // Precompute channel labels so repeated replace operations don't thrash renders.
    return new Map(channelEnum.options.map((channel) => [channel, channel.replace(/_/g, ' ')]));
  }, []);

  const liveMessage = useMemo(
    // Keep screen reader announcements stable whenever sorting changes.
    () =>
      sorted
        .map((summary) => {
          const label = channelLabels.get(summary.channel) ?? summary.channel;
          const start = summary.startDate ? formatDate(summary.startDate) : 'No start date';
          const end = summary.endDate ? formatDate(summary.endDate) : 'No end date';
          return `${label}: ${start} to ${end}`;
        })
        .join('. '),
    [channelLabels, sorted],
  );

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setDirection('asc');
      }
    },
    [sortKey],
  );

  const handleChannelSelect = useCallback(
    (current: Channel, next: Channel) => {
      if (readOnly || current === next) return;
      // Defer persistence to the parent so we can respect existing data flows.
      onChannelChange?.(current, next);
    },
    [onChannelChange, readOnly],
  );

  const handleToggle = useCallback((channel: Channel) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  }, []);

  const handleAddChannel = useCallback(
    async (channel: Channel) => {
      if (readOnly) return;
      const nextPlan = addChannelDraft(plan, channel);
      await mutatePlan.mutateAsync(nextPlan);
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(channel);
        return next;
      });
      setAddDialogOpen(false);
    },
    [mutatePlan, plan, readOnly],
  );

  const handleSaveSchedule = useCallback(
    async (flightId: string, periods: { start: string; end: string }[]) => {
      const nextPlan: Plan = {
        ...plan,
        flights: plan.flights.map((flight) =>
          flight.flight_id === flightId ? { ...flight, active_periods_json: periods } : flight,
        ),
      };
      await mutatePlan.mutateAsync(nextPlan);
      setScheduleTarget(null);
      scheduleTriggerRef.current?.focus();
    },
    [mutatePlan, plan],
  );

  return (
    <section aria-labelledby="channel-table-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="channel-table-heading" className="text-lg font-semibold text-slate-900">
            Channel allocations
          </h2>
          <p className="text-sm text-slate-500">{summaries.length} channels</p>
        </div>
        {!readOnly ? (
          <Button onClick={() => setAddDialogOpen(true)}>Add channel</Button>
        ) : null}
      </div>
      {summaries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          No channels yet. Add line items to populate this plan.
        </p>
      ) : (
        <Fragment>
          <Table className="max-h-[28rem]">
            <THead sticky>
              <tr>
                <Th ariaSort="none">Channel</Th>
                <Th
                  ariaSort={
                    sortKey === 'startDate' ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                >
                  <SortButton
                    label="Start date"
                    active={sortKey === 'startDate'}
                    direction={direction}
                    onClick={() => toggleSort('startDate')}
                  />
                </Th>
                <Th
                  ariaSort={
                    sortKey === 'endDate' ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                >
                  <SortButton
                    label="End date"
                    active={sortKey === 'endDate'}
                    direction={direction}
                    onClick={() => toggleSort('endDate')}
                  />
                </Th>
                <Th
                  ariaSort={
                    sortKey === 'totalCost' ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                >
                  <SortButton
                    label="Cost"
                    active={sortKey === 'totalCost'}
                    direction={direction}
                    onClick={() => toggleSort('totalCost')}
                  />
                </Th>
                <Th ariaSort="none">Budget %</Th>
                <Th ariaSort="none">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {sorted.map((summary) => {
                const panelId = `channel-${summary.channel}-panel`;
                const isExpanded = expanded.has(summary.channel);
                const share = totalPlanCost > 0 ? summary.totalCost / totalPlanCost : 0;

                return (
                  <Fragment key={summary.channel}>
                    <tr className="bg-white hover:bg-slate-50 focus-within:bg-slate-50">
                      <Td>
                        <Select
                          aria-label={`Channel ${channelLabels.get(summary.channel) ?? summary.channel}`}
                          value={summary.channel}
                          disabled={readOnly || !onChannelChange}
                          onChange={(event) =>
                            handleChannelSelect(summary.channel, event.currentTarget.value as Channel)
                          }
                        >
                          {channelEnum.options.map((channel) => (
                            <option key={channel} value={channel}>
                              {channelLabels.get(channel) ?? channel.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td>{summary.startDate ? formatDate(summary.startDate) : '—'}</Td>
                      <Td>{summary.endDate ? formatDate(summary.endDate) : '—'}</Td>
                      <Td align="right">{currencyFormatter.format(summary.totalCost)}</Td>
                      <Td align="right">{percentFormatter.format(share)}</Td>
                      <Td align="right">
                        <Button
                          variant="ghost"
                          aria-expanded={isExpanded}
                          aria-controls={panelId}
                          onClick={() => handleToggle(summary.channel)}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${summary.channel} channel flightings`}
                        >
                          {isExpanded ? 'Hide flightings' : 'View flightings'}
                        </Button>
                      </Td>
                    </tr>
                    {isExpanded ? (
                      <tr id={panelId}>
                        <Td colSpan={5}>
                          <div className="py-4">
                            <FlightingsSection
                              plan={plan}
                              channel={summary.channel}
                              readOnly={readOnly}
                              onViewDetails={(row, button) => {
                                detailTriggerRef.current = button;
                                setActiveFlight(row);
                              }}
                              onEditSchedule={(row, button) => {
                                if (!row.flight || readOnly) return;
                                scheduleTriggerRef.current = button;
                                setScheduleTarget(row);
                              }}
                            />
                          </div>
                        </Td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>
          <span className="sr-only" aria-live="polite">
            {liveMessage}
          </span>
        </Fragment>
      )}
      <FlightDetailsModal
        flighting={activeFlight}
        open={Boolean(activeFlight)}
        onClose={() => {
          setActiveFlight(null);
          detailTriggerRef.current?.focus();
        }}
      />
      <FlightingScheduleDialog
        flighting={scheduleTarget}
        open={Boolean(scheduleTarget)}
        onClose={() => {
          setScheduleTarget(null);
          scheduleTriggerRef.current?.focus();
        }}
        onSave={handleSaveSchedule}
      />
      <AddChannelDialog
        open={addDialogOpen}
        busy={mutatePlan.isPending}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddChannel}
      />
    </section>
  );
}

type SortButtonProps = {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
};

function SortButton({ label, active, direction, onClick }: SortButtonProps) {
  return (
    <button
      type="button"
      className={clsx('flex items-center gap-1 text-left text-sm font-medium text-slate-600', {
        'text-slate-900': active,
      })}
      aria-label={`${label} ${active ? (direction === 'asc' ? 'ascending' : 'descending') : 'unsorted'}`}
      onClick={onClick}
    >
      {label}
      <span aria-hidden="true" className="text-xs text-slate-400">
        {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  );
}

type FlightingsSectionProps = {
  plan: Plan;
  channel: Channel;
  readOnly: boolean;
  onViewDetails: (row: ChannelFlighting, trigger: HTMLButtonElement) => void;
  onEditSchedule: (row: ChannelFlighting, trigger: HTMLButtonElement) => void;
};

function FlightingsSection({ plan, channel, readOnly, onViewDetails, onEditSchedule }: FlightingsSectionProps) {
  const { data, isLoading, isError, refetch, isRefetching } = useChannelFlightings(plan.id, channel);

  let content: ReactNode;

  if (isLoading || isRefetching) {
    content = (
      <p className="p-4 text-sm text-slate-500" role="status">
        Loading flightings…
      </p>
    );
  } else if (isError) {
    content = (
      <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
        <p>We were unable to load the {channel.replace(/_/g, ' ')} flightings.</p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  } else if (!data || data.length === 0) {
    content = (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        No flightings yet. Add a line item for this channel to see it here.
      </p>
    );
  } else {
    const columns = getColumnsForChannel(channel);

    content = (
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table
          className="min-w-full divide-y divide-slate-200 text-sm text-slate-700"
          aria-label={`${channel.replace(/_/g, ' ')} flightings`}
        >
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.id} className="px-4 py-2 text-left font-medium">
                  {column.label}
                </th>
              ))}
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row) => (
              <tr key={row.lineItem.line_item_id} className="bg-white hover:bg-slate-50">
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={clsx('px-4 py-2', {
                        'text-right': column.align === 'right',
                        'text-center': column.align === 'center',
                        'text-left': column.align === 'left' || !column.align,
                      })}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                <td className="px-4 py-2 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="secondary"
                      disabled={readOnly || !row.flight}
                      onClick={(event) => {
                        onEditSchedule(row, event.currentTarget);
                      }}
                    >
                      Edit schedule
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={(event) => {
                        onViewDetails(row, event.currentTarget);
                      }}
                    >
                      View additional details
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <div aria-live="polite">{content}</div>;
}
