import { Fragment, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { channelTableConfig, type ColumnSpec } from '@/config/channelTableConfig';
import {
  buildFlightingContexts,
  computeChannelSummaries,
  getFieldValue,
  setFieldValue,
  validateField,
  type ChannelSummary,
  type FlightingRowContext,
  type FlightingValue,
} from '@/lib/channelTable';
import type { Channel, Plan } from '@/lib/schemas';
import { currencyFormatter, numberFormatter } from '@/lib/formatters';
import { formatDate } from '@/lib/date';
import { Button } from '@/ui/Button';
import { Select } from '@/ui/Select';
import { Table, THead, TBody, Th, Td } from '@/ui/Table';
import { useMutatePlan, type ChannelFlighting } from '@/api/plans';
import { addFlighting, duplicateFlighting, removeFlighting } from '@/lib/planBuilders';
import { FlightDetailsModal } from './FlightDetailsModal';

type ChannelTableProps = {
  plan: Plan;
  readOnly?: boolean;
};

type SortKey = 'channel' | 'start_date' | 'end_date' | 'total_planned_cost' | 'budget_percent';

type SortState = {
  key: SortKey;
  direction: 'asc' | 'desc';
};

type Filters = {
  channel?: Channel;
  costMin?: string;
  costMax?: string;
  start?: string;
  end?: string;
};

type CellErrorMap = Record<string, Record<string, string>>;

type FlightingTotals = Record<string, number>;

const COMMON_COLUMN_COUNT = channelTableConfig.flightingCommonColumns.length;

function formatPercentValue(value: number, precision?: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'percent',
    maximumFractionDigits: precision ?? 1,
  }).format(value);
}

function formatDisplayValue(column: ColumnSpec, value: FlightingValue) {
  if (value == null || value === '') {
    return '—';
  }
  switch (column.type) {
    case 'date':
      return typeof value === 'string' ? formatDate(value) : '—';
    case 'currency':
      return currencyFormatter.format(Number(value));
    case 'percent':
      return formatPercentValue(Number(value), column.precision);
    case 'number':
      return numberFormatter.format(Number(value));
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return String(value);
  }
}

function valueToInput(column: ColumnSpec, value: FlightingValue): string | number | boolean {
  if (value == null) {
    if (column.type === 'boolean') return false;
    return '';
  }
  switch (column.type) {
    case 'percent':
      return Number(value) * 100;
    case 'number':
    case 'currency':
      return Number(value);
    case 'boolean':
      return Boolean(value);
    default:
      return String(value);
  }
}

function inputToValue(column: ColumnSpec, input: unknown): FlightingValue {
  switch (column.type) {
    case 'percent': {
      const numeric = Number(input);
      if (!Number.isFinite(numeric)) return 0;
      return numeric / 100;
    }
    case 'currency':
    case 'number': {
      const numeric = Number(input);
      if (!Number.isFinite(numeric)) return 0;
      return numeric;
    }
    case 'boolean':
      return Boolean(input);
    default:
      return typeof input === 'string' ? input : String(input ?? '');
  }
}

function cumulativeStickyOffsets(columns: ColumnSpec[], stickyCount: number) {
  const offsets: number[] = [];
  let accumulator = 0;
  for (let index = 0; index < columns.length; index += 1) {
    if (index < stickyCount) {
      offsets.push(accumulator);
      const width = columns[index]?.width ?? 160;
      accumulator += width;
    } else {
      offsets.push(0);
    }
  }
  return offsets;
}

function applyFilters(summaries: ChannelSummary[], filters: Filters) {
  return summaries.filter((summary) => {
    if (filters.channel && summary.channel !== filters.channel) {
      return false;
    }
    if (filters.costMin) {
      const min = Number(filters.costMin);
      if (Number.isFinite(min) && summary.totalPlannedCost < min) {
        return false;
      }
    }
    if (filters.costMax) {
      const max = Number(filters.costMax);
      if (Number.isFinite(max) && summary.totalPlannedCost > max) {
        return false;
      }
    }
    if (filters.start) {
      if (!summary.startDate || new Date(summary.startDate) < new Date(filters.start)) {
        return false;
      }
    }
    if (filters.end) {
      if (!summary.endDate || new Date(summary.endDate) > new Date(filters.end)) {
        return false;
      }
    }
    return true;
  });
}

function sortSummaries(summaries: ChannelSummary[], sort: SortState | null) {
  if (!sort) return summaries;
  return [...summaries].sort((a, b) => {
    const direction = sort.direction === 'asc' ? 1 : -1;
    switch (sort.key) {
      case 'channel':
        return a.channel.localeCompare(b.channel) * direction;
      case 'start_date':
        return ((a.startDate ?? '') > (b.startDate ?? '') ? 1 : -1) * direction;
      case 'end_date':
        return ((a.endDate ?? '') > (b.endDate ?? '') ? 1 : -1) * direction;
      case 'total_planned_cost':
        return (a.totalPlannedCost - b.totalPlannedCost) * direction;
      case 'budget_percent':
        return (a.budgetPercent - b.budgetPercent) * direction;
      default:
        return 0;
    }
  });
}

function createChannelFlighting(plan: Plan, context: FlightingRowContext): ChannelFlighting {
  const creative = plan.creatives.find((item) => item.creative_id === context.lineItem.creative_id);
  const tracking = plan.tracking.find((item) => item.line_item_id === context.lineItem.line_item_id);
  return {
    lineItem: context.lineItem,
    flight: context.flight,
    vendor: context.vendor,
    audience: context.audience,
    creative,
    tracking,
  };
}

export function ChannelTable({ plan, readOnly }: ChannelTableProps) {
  const mutatePlan = useMutatePlan();
  const [workingPlan, setWorkingPlan] = useState(plan);
  const [expandedChannels, setExpandedChannels] = useState<Set<Channel>>(new Set());
  const [sort, setSort] = useState<SortState>({ key: 'channel', direction: 'asc' });
  const [filters, setFilters] = useState<Filters>({});
  const [errors, setErrors] = useState<CellErrorMap>({});
  const [modalFlighting, setModalFlighting] = useState<ChannelFlighting | null>(null);
  const [emptyChannels, setEmptyChannels] = useState<Set<Channel>>(new Set());

  useEffect(() => {
    setWorkingPlan(plan);
    setEmptyChannels((current) => {
      const withData = new Set(computeChannelSummaries(plan).map((summary) => summary.channel));
      const next = new Set<Channel>();
      current.forEach((channel) => {
        if (!withData.has(channel)) {
          next.add(channel);
        }
      });
      return next;
    });
  }, [plan]);

  const summaries = useMemo(() => {
    const computed = computeChannelSummaries(workingPlan);
    const withData = new Set(computed.map((summary) => summary.channel));
    const manual = Array.from(emptyChannels)
      .filter((channel) => !withData.has(channel))
      .map((channel) => ({
        channel,
        startDate: null,
        endDate: null,
        totalPlannedCost: 0,
        budgetPercent: 0,
        lineItemIds: [],
      }));
    return [...computed, ...manual].sort((a, b) => a.channel.localeCompare(b.channel));
  }, [workingPlan, emptyChannels]);
  const filteredSummaries = useMemo(() => applyFilters(summaries, filters), [summaries, filters]);
  const sortedSummaries = useMemo(() => sortSummaries(filteredSummaries, sort), [filteredSummaries, sort]);

  const stickyOffsets = useMemo(
    () => cumulativeStickyOffsets(channelTableConfig.topLevelColumns, channelTableConfig.topLevelColumns.length - 1),
    [],
  );

  const handleToggle = (channel: Channel) => {
    setExpandedChannels((current) => {
      const next = new Set(current);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
      }
      return next;
    });
  };

  const updatePlan = (next: Plan) => {
    setWorkingPlan(next);
    mutatePlan.mutate(next);
  };

  const handleAddFlighting = (channel: Channel) => {
    const nextPlan = addFlighting(workingPlan, channel);
    updatePlan(nextPlan);
    setExpandedChannels((current) => new Set(current).add(channel));
    setEmptyChannels((current) => {
      const next = new Set(current);
      next.delete(channel);
      return next;
    });
  };

  const handleDuplicateFlighting = (lineItemId: string) => {
    const nextPlan = duplicateFlighting(workingPlan, lineItemId);
    updatePlan(nextPlan);
  };

  const handleRemoveFlighting = (channel: Channel, lineItemId: string) => {
    setErrors((current) => {
      const next = { ...current };
      delete next[lineItemId];
      return next;
    });
    const nextPlan = removeFlighting(workingPlan, lineItemId);
    updatePlan(nextPlan);
    const contexts = buildFlightingContexts(nextPlan, channel);
    if (contexts.length === 0) {
      setEmptyChannels((current) => {
        const next = new Set(current);
        next.add(channel);
        return next;
      });
    }
  };

  const handleSort = (key: SortKey) => {
    setSort((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const topColumns = channelTableConfig.topLevelColumns;

  return (
    <section aria-labelledby="channel-table" className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col text-sm">
          <label htmlFor="channel-filter" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Channel
          </label>
          <select
            id="channel-filter"
            className="mt-1 rounded-md border border-slate-300 p-2 text-sm"
            value={filters.channel ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                channel: (event.target.value as Channel) || undefined,
              }))
            }
          >
            <option value="">All channels</option>
            {Array.from(new Set(summaries.map((summary) => summary.channel))).map((channel) => (
              <option key={channel} value={channel}>
                {channel.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col text-sm">
          <label htmlFor="cost-min" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Min cost (AUD)
          </label>
          <input
            id="cost-min"
            type="number"
            className="mt-1 w-32 rounded-md border border-slate-300 p-2 text-sm"
            value={filters.costMin ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, costMin: event.target.value }))}
          />
        </div>
        <div className="flex flex-col text-sm">
          <label htmlFor="cost-max" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Max cost (AUD)
          </label>
          <input
            id="cost-max"
            type="number"
            className="mt-1 w-32 rounded-md border border-slate-300 p-2 text-sm"
            value={filters.costMax ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, costMax: event.target.value }))}
          />
        </div>
        <div className="flex flex-col text-sm">
          <label htmlFor="start-filter" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Earliest start
          </label>
          <input
            id="start-filter"
            type="date"
            className="mt-1 rounded-md border border-slate-300 p-2 text-sm"
            value={filters.start ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, start: event.target.value }))}
          />
        </div>
        <div className="flex flex-col text-sm">
          <label htmlFor="end-filter" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Latest end
          </label>
          <input
            id="end-filter"
            type="date"
            className="mt-1 rounded-md border border-slate-300 p-2 text-sm"
            value={filters.end ?? ''}
            onChange={(event) => setFilters((current) => ({ ...current, end: event.target.value }))}
          />
        </div>
        <Button variant="secondary" onClick={() => setFilters({})}>
          Reset filters
        </Button>
      </div>

      <Table>
        <THead sticky>
          <tr>
            {topColumns.map((column, index) => (
              <Th
                key={column.id}
                ariaSort={sort?.key === column.id ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={clsx('bg-white', {
                  'cursor-pointer select-none': ['channel', 'start_date', 'end_date', 'total_planned_cost', 'budget_percent'].includes(
                    column.id,
                  ),
                })}
                style={index < topColumns.length - 1 ? { position: 'sticky', left: stickyOffsets[index], zIndex: 5, background: 'white' } : undefined}
                onClick={() =>
                  ['channel', 'start_date', 'end_date', 'total_planned_cost', 'budget_percent'].includes(column.id) &&
                  handleSort(column.id as SortKey)
                }
              >
                {column.label}
              </Th>
            ))}
          </tr>
        </THead>
        <TBody>
          {sortedSummaries.length === 0 ? (
            <tr>
              <Td colSpan={topColumns.length} className="text-sm text-slate-500">
                No channels match the current filters.
              </Td>
            </tr>
          ) : (
            sortedSummaries.map((summary) => {
              const isExpanded = expandedChannels.has(summary.channel);
              const panelId = `channel-${summary.channel}-flightings`;
              return (
                <Fragment key={summary.channel}>
                  <tr className={clsx('transition-colors', { 'bg-slate-50': isExpanded })}>
                    {topColumns.map((column, columnIndex) => {
                      switch (column.id) {
                        case 'channel':
                          return (
                            <Td
                              key={column.id}
                              style={{ position: 'sticky', left: stickyOffsets[columnIndex], background: 'white' }}
                            >
                              {summary.channel.replace(/_/g, ' ')}
                            </Td>
                          );
                        case 'start_date':
                          return (
                            <Td
                              key={column.id}
                              style={{ position: 'sticky', left: stickyOffsets[columnIndex], background: 'white' }}
                            >
                              {summary.startDate ? formatDate(summary.startDate) : '—'}
                            </Td>
                          );
                        case 'end_date':
                          return (
                            <Td
                              key={column.id}
                              style={{ position: 'sticky', left: stickyOffsets[columnIndex], background: 'white' }}
                            >
                              {summary.endDate ? formatDate(summary.endDate) : '—'}
                            </Td>
                          );
                        case 'total_planned_cost':
                          return (
                            <Td
                              key={column.id}
                              align="right"
                              style={{ position: 'sticky', left: stickyOffsets[columnIndex], background: 'white' }}
                            >
                              {currencyFormatter.format(summary.totalPlannedCost)}
                            </Td>
                          );
                        case 'budget_percent':
                          return (
                            <Td
                              key={column.id}
                              align="right"
                              style={{ position: 'sticky', left: stickyOffsets[columnIndex], background: 'white' }}
                            >
                              {formatPercentValue(summary.budgetPercent, column.precision)}
                            </Td>
                          );
                        case 'actions':
                          return (
                            <Td key={column.id} align="right">
                              <Button
                                variant="ghost"
                                aria-expanded={isExpanded}
                                aria-controls={panelId}
                                onClick={() => handleToggle(summary.channel)}
                              >
                                {isExpanded ? 'Hide flightings' : 'View flightings'}
                              </Button>
                            </Td>
                          );
                        default:
                          return <Td key={column.id}>—</Td>;
                      }
                    })}
                    </tr>
                    {isExpanded ? (
                      <tr>
                        <Td colSpan={topColumns.length} className="bg-slate-50 p-0" id={panelId}>
                          <FlightingTable
                            key={`flighting-${summary.channel}`}
                            plan={workingPlan}
                            channel={summary.channel}
                            readOnly={Boolean(readOnly)}
                            errors={errors}
                            onDuplicate={handleDuplicateFlighting}
                            onDelete={(lineItemId) => handleRemoveFlighting(summary.channel, lineItemId)}
                            onUpdateErrors={setErrors}
                            onPlanChange={updatePlan}
                            onOpenDetails={(flight) => setModalFlighting(flight)}
                            onAddFlighting={() => handleAddFlighting(summary.channel)}
                          />
                        </Td>
                      </tr>
                    ) : null}
                </Fragment>
              );
            })
          )}
        </TBody>
      </Table>

      <FlightDetailsModal flighting={modalFlighting} open={Boolean(modalFlighting)} onClose={() => setModalFlighting(null)} />
    </section>
  );
}

type FlightingTableProps = {
  plan: Plan;
  channel: Channel;
  readOnly: boolean;
  errors: CellErrorMap;
  onPlanChange: (plan: Plan) => void;
  onDuplicate: (lineItemId: string) => void;
  onDelete: (lineItemId: string) => void;
  onUpdateErrors: (errors: CellErrorMap) => void;
  onOpenDetails: (flighting: ChannelFlighting) => void;
  onAddFlighting: () => void;
};

function FlightingTable({
  plan,
  channel,
  readOnly,
  errors,
  onPlanChange,
  onDuplicate,
  onDelete,
  onUpdateErrors,
  onOpenDetails,
  onAddFlighting,
}: FlightingTableProps) {
  const contexts = buildFlightingContexts(plan, channel);
  const columns = useMemo(
    () => [
      ...channelTableConfig.flightingCommonColumns,
      ...(channelTableConfig.channelSpecificColumns[channel] ?? []),
    ],
    [channel],
  );
  const stickyOffsets = useMemo(
    () => cumulativeStickyOffsets(columns, COMMON_COLUMN_COUNT),
    [columns],
  );

  const totals: FlightingTotals = {};

  const updateErrorState = (lineItemId: string, field: string, message: string | null) => {
    onUpdateErrors((current) => {
      const next = { ...current };
      const entry = { ...(next[lineItemId] ?? {}) };
      if (message) {
        entry[field] = message;
      } else {
        delete entry[field];
      }
      if (Object.keys(entry).length > 0) {
        next[lineItemId] = entry;
      } else {
        delete next[lineItemId];
      }
      return next;
    });
  };

  const handleCommit = (context: FlightingRowContext, column: ColumnSpec, rawValue: unknown) => {
    const value = inputToValue(column, rawValue);
    const issue = validateField(channel, context, column.id, value);
    if (issue) {
      updateErrorState(context.lineItem.line_item_id, column.id, issue.message);
      return;
    }
    const result = setFieldValue(channel, context, column.id, value);
    updateErrorState(context.lineItem.line_item_id, column.id, null);
    onPlanChange(result.plan);
  };

  return (
    <div className="rounded-b-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm text-slate-700">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column, index) => {
                const width = column.width;
                const widthStyle = width ? { width, minWidth: width } : {};
                const stickyStyle =
                  index < COMMON_COLUMN_COUNT
                    ? { position: 'sticky' as const, left: stickyOffsets[index], background: '#f1f5f9', zIndex: 4 }
                    : {};
                return (
                  <th
                    key={column.id}
                    className="border-b border-slate-200 px-4 py-2 font-medium"
                    style={{ ...widthStyle, ...stickyStyle }}
                  >
                    {column.label}
                  </th>
                );
              })}
              <th className="border-b border-slate-200 px-4 py-2 text-right font-medium" style={{ width: 180, minWidth: 180 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {contexts.map((context) => {
              const rowErrors = errors[context.lineItem.line_item_id] ?? {};
              columns.forEach((column) => {
                if (['number', 'currency'].includes(column.type)) {
                  const raw = getFieldValue(channel, context, column.id);
                  const numeric = Number(raw);
                  if (Number.isFinite(numeric)) {
                    totals[column.id] = (totals[column.id] ?? 0) + numeric;
                  }
                }
              });

              return (
                <tr key={context.lineItem.line_item_id} className="border-b border-slate-200 last:border-b-0">
                  {columns.map((column, index) => {
                    const value = getFieldValue(channel, context, column.id);
                    const inputValue = valueToInput(column, value);
                    const editable = !readOnly && column.editable !== false;
                    const error = rowErrors[column.id];
                    const width = column.width;
                    const widthStyle = width ? { width, minWidth: width } : {};
                    const stickyStyle =
                      index < COMMON_COLUMN_COUNT
                        ? {
                            position: 'sticky' as const,
                            left: stickyOffsets[index],
                            background: index === 0 ? '#ffffff' : '#f8fafc',
                            zIndex: 3,
                          }
                        : {};
                    return (
                      <td
                        key={column.id}
                        className={clsx('px-4 py-3 align-top', {
                          'bg-white': index >= COMMON_COLUMN_COUNT,
                          'bg-slate-50': index < COMMON_COLUMN_COUNT,
                          'text-center': column.align === 'center',
                          'text-right': column.align === 'right' || ['number', 'currency', 'percent'].includes(column.type),
                        })}
                        style={{ ...widthStyle, ...stickyStyle }}
                      >
                        {editable ? (
                          <EditableCell
                            column={column}
                            value={inputValue}
                            onCommit={(next) => handleCommit(context, column, next)}
                            error={error}
                          />
                        ) : (
                          <span className="text-slate-900">{formatDisplayValue(column, value)}</span>
                        )}
                        {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3" style={{ width: 180, minWidth: 180 }}>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => onOpenDetails(createChannelFlighting(plan, context))}>
                        View details
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={readOnly}
                        onClick={() => onDuplicate(context.lineItem.line_item_id)}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant="danger"
                        disabled={readOnly}
                        onClick={() => onDelete(context.lineItem.line_item_id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {contexts.length > 0 ? (
            <tfoot className="bg-slate-100 text-sm font-medium text-slate-700">
              <tr className="border-t border-slate-200">
                {columns.map((column, index) => {
                  const total = totals[column.id];
                  const display =
                    total != null && ['number', 'currency'].includes(column.type)
                      ? column.type === 'currency'
                        ? currencyFormatter.format(total)
                        : numberFormatter.format(total)
                      : index === 0
                        ? 'Totals'
                        : '';
                  const width = column.width;
                  const widthStyle = width ? { width, minWidth: width } : {};
                  const stickyStyle =
                    index < COMMON_COLUMN_COUNT
                      ? { position: 'sticky' as const, left: stickyOffsets[index], background: '#e2e8f0', zIndex: 2 }
                      : {};
                  return (
                    <td
                      key={column.id}
                      className={clsx('px-4 py-2', {
                        'font-semibold text-slate-900': index === 0,
                        'text-right': ['number', 'currency'].includes(column.type),
                      })}
                      style={{ ...widthStyle, ...stickyStyle }}
                    >
                      {display}
                    </td>
                  );
                })}
                <td className="px-4 py-2" style={{ width: 180, minWidth: 180 }} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <div className="border-t border-slate-200 px-4 py-3">
        <Button disabled={readOnly} onClick={onAddFlighting}>
          Add flighting
        </Button>
      </div>
    </div>
  );
}

type EditableCellProps = {
  column: ColumnSpec;
  value: string | number | boolean;
  onCommit: (value: string | number | boolean) => void;
  error?: string;
};

function EditableCell({ column, value, onCommit }: EditableCellProps) {
  const [draft, setDraft] = useState<string | number | boolean>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = () => {
    onCommit(draft);
  };

  if (column.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={Boolean(draft)}
        aria-label={column.label}
        onChange={(event) => onCommit(event.target.checked)}
        className="h-4 w-4"
      />
    );
  }

  if (column.type === 'enum' && column.enum) {
    return (
      <Select
        aria-label={column.label}
        value={String(draft ?? '')}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          onCommit(event.currentTarget.value);
        }}
      >
        {column.enum.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    );
  }

  const inputType = column.type === 'date' ? 'date' : 'text';
  const step = column.type === 'number' || column.type === 'currency' || column.type === 'percent' ? 'any' : undefined;

  return (
    <input
      type={column.type === 'number' || column.type === 'currency' || column.type === 'percent' ? 'number' : inputType}
      value={typeof draft === 'number' ? Number.isFinite(draft) ? draft : '' : String(draft ?? '')}
      step={step}
      aria-label={column.label}
      onBlur={handleBlur}
      onChange={(event) => {
        const nextValue =
          column.type === 'number' || column.type === 'currency' || column.type === 'percent'
            ? Number(event.target.value)
            : event.target.value;
        setDraft(nextValue as typeof draft);
      }}
      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}
