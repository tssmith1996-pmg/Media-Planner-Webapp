import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { usePlan, useMutatePlan } from '@/api/plans';
import { Button } from '@/ui/Button';
import { Select } from '@/ui/Select';
import { Card } from '@/ui/Card';
import { formatDate, formatDateRange, enumeratePlanWeeks } from '@/lib/date';
import type { Plan, Channel, LineItem, WeekStartDay } from '@/lib/schemas';
import {
  changePlanWeekStart,
  ensurePlanBlockPlans,
  toggleBlockPlanWeek,
} from '@/lib/blockPlan';
import { currencyFormatter } from '@/lib/formatters';

function groupLineItems(plan: Plan) {
  const flightsById = new Map(plan.flights.map((flight) => [flight.flight_id, flight]));
  const vendorsById = new Map(plan.vendors.map((vendor) => [vendor.vendor_id, vendor]));
  const creativesById = new Map(plan.creatives.map((creative) => [creative.creative_id, creative]));

  const groups = new Map<Channel, { channel: Channel; items: Array<{ lineItem: LineItem }> }>();
  for (const lineItem of plan.lineItems) {
    if (!groups.has(lineItem.channel)) {
      groups.set(lineItem.channel, { channel: lineItem.channel, items: [] });
    }
    groups.get(lineItem.channel)?.items.push({ lineItem });
  }

  const sorted = Array.from(groups.values()).sort((a, b) => a.channel.localeCompare(b.channel));

  return sorted.map((group) => ({
    channel: group.channel,
    label: group.channel.replace(/_/g, ' '),
    rows: group.items
      .map(({ lineItem }) => {
        const flight = flightsById.get(lineItem.flight_id);
        const vendor = vendorsById.get(lineItem.vendor_id);
        const creative = creativesById.get(lineItem.creative_id);
        const title = creative?.ad_name ?? vendor?.name ?? lineItem.line_item_id;
        const sublabel = vendor?.name ?? creative?.ad_name ?? 'Flighting';
        const blockPlanWeeks = lineItem.block_plan?.weeks ?? [];
        const cost = currencyFormatter.format(lineItem.cost_planned);

        return {
          id: lineItem.line_item_id,
          title,
          sublabel,
          flightRange: flight ? formatDateRange(flight.start_date, flight.end_date) : 'Unset',
          cost,
          lineItem,
          weeks: blockPlanWeeks,
        };
      })
      .sort((a, b) => a.flightRange.localeCompare(b.flightRange)),
  }));
}

export function BlockPlanPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { data: plan, isLoading } = usePlan(params.id);
  const mutatePlan = useMutatePlan();
  const [workingPlan, setWorkingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!plan) return;
    setWorkingPlan(ensurePlanBlockPlans(plan));
  }, [plan]);

  const weeks = useMemo(() => {
    if (!workingPlan) return [];
    return enumeratePlanWeeks(workingPlan.start_date, workingPlan.end_date, workingPlan.week_start_day);
  }, [workingPlan]);

  const groups = useMemo(() => {
    if (!workingPlan) return [];
    return groupLineItems(workingPlan);
  }, [workingPlan]);

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-6 lg:py-10">
        <p className="text-sm text-slate-500" role="status">
          Loading block plan…
        </p>
      </main>
    );
  }

  if (!workingPlan) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Card className="space-y-4 p-8 text-center">
          <p className="text-base font-semibold text-slate-900">Plan not found</p>
          <p className="text-sm text-slate-600">The requested plan could not be loaded.</p>
          <Button onClick={() => navigate(-1)}>Back to plans</Button>
        </Card>
      </main>
    );
  }

  const handleToggle = (lineItemId: string, weekKey: string) => {
    const next = toggleBlockPlanWeek(workingPlan, lineItemId, weekKey);
    setWorkingPlan(next);
    mutatePlan.mutate(next);
  };

  const handleWeekStartChange = (value: string) => {
    const next = changePlanWeekStart(workingPlan, value as WeekStartDay);
    setWorkingPlan(next);
    mutatePlan.mutate(next);
  };

  return (
    <main className="container mx-auto max-w-7xl px-4 py-6 lg:py-10">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-600">Block plan</p>
            <h1 className="text-2xl font-semibold text-slate-900 lg:text-3xl">{workingPlan.meta.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {formatDateRange(workingPlan.start_date, workingPlan.end_date)}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              Week start
              <Select
                aria-label="Select week start"
                value={workingPlan.week_start_day}
                onChange={(event) => handleWeekStartChange(event.currentTarget.value)}
              >
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
              </Select>
            </label>
            <Button variant="secondary" onClick={() => navigate(`/plan/${workingPlan.id}`)}>
              Back to plan
            </Button>
          </div>
        </header>

        <section aria-labelledby="block-plan-legend" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="block-plan-legend" className="text-base font-semibold text-slate-900">
                Weekly coverage
              </h2>
              <p className="text-sm text-slate-600">
                Toggle weeks to mark when each flighting is in market. Filled squares indicate active weeks.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th
                    className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left"
                    style={{ minWidth: '240px', width: '240px' }}
                  >
                    Flighting
                  </th>
                  <th
                    className="sticky left-[240px] z-10 bg-slate-100 px-4 py-3 text-left"
                    style={{ minWidth: '140px', width: '140px' }}
                  >
                    Cost
                  </th>
                  {weeks.map((week) => (
                    <th key={week.key} className="px-3 py-3 text-center">
                      <span className="block text-xs font-medium text-slate-700">
                        {formatDate(week.start)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={weeks.length + 2} className="px-4 py-6 text-center text-sm text-slate-500">
                      No flightings scheduled yet. Add line items in the main plan view to populate the block plan.
                    </td>
                  </tr>
                ) : null}
                {groups.map((group) => (
                  <Fragment key={group.channel}>
                    <tr className="border-t border-slate-200">
                      <td
                        colSpan={weeks.length + 2}
                        className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        {group.label}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-200">
                        <th
                          scope="row"
                          className="sticky left-0 z-[1] bg-white px-4 py-3 text-left text-sm font-medium text-slate-900"
                          style={{ minWidth: '240px', width: '240px' }}
                        >
                          <div className="flex flex-col">
                            <span>{row.title}</span>
                            <span className="text-xs font-normal text-slate-500">{row.sublabel}</span>
                            <span className="text-xs font-normal text-slate-500">{row.flightRange}</span>
                          </div>
                        </th>
                        <td
                          className="sticky left-[240px] z-[1] bg-white px-4 py-3 text-sm text-slate-700"
                          style={{ minWidth: '140px', width: '140px' }}
                        >
                          {row.cost}
                        </td>
                        {weeks.map((week) => {
                          const active = row.weeks.some((entry) => entry.week_start === week.key && entry.active);
                          return (
                            <td key={`${row.id}-${week.key}`} className="px-3 py-2 text-center">
                              <button
                                type="button"
                                aria-pressed={active}
                                className={clsx(
                                  'mx-auto flex h-10 w-10 items-center justify-center rounded-md border text-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                                  active
                                    ? 'border-indigo-600 bg-indigo-600 font-semibold text-white shadow-sm'
                                    : 'border-slate-300 bg-white text-slate-500 hover:border-indigo-400 hover:text-indigo-600',
                                )}
                                onClick={() => handleToggle(row.id, week.key)}
                              >
                                <span className="sr-only">Toggle week starting {formatDate(week.start)}</span>
                                <span aria-hidden>{active ? '■' : '□'}</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
