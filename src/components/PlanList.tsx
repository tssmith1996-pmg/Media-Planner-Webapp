import type { Plan } from '@/lib/schemas';
import { PlanCard } from './PlanCard';
import { Table, THead, TBody, Th, Td } from '@/ui/Table';
import { currencyFormatter } from '@/lib/formatters';
import { formatDate, formatDateRange } from '@/lib/date';
import { Button } from '@/ui/Button';

export type PlanListView = 'grid' | 'list';

function getPlanDateRange(plan: Plan) {
  if (plan.flights.length === 0) return 'Not scheduled';
  const starts = plan.flights.map((flight) => flight.start_date);
  const ends = plan.flights.map((flight) => flight.end_date);
  const minStart = starts.reduce((min, current) => (current < min ? current : min), starts[0]);
  const maxEnd = ends.reduce((max, current) => (current > max ? current : max), ends[0]);
  return formatDateRange(minStart, maxEnd);
}

function getCreatedEvent(plan: Plan) {
  const created = plan.audit.find((event) => event.action === 'created');
  return created ?? plan.audit[0];
}

function getLastEvent(plan: Plan) {
  return plan.audit[plan.audit.length - 1];
}

function GridView({
  plans,
  onOpen,
  onReview,
  onDuplicate,
}: {
  plans: Plan[];
  onOpen: (id: string) => void;
  onReview: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          onOpen={() => onOpen(plan.id)}
          onReview={() => onReview(plan.id)}
          onDuplicate={() => onDuplicate(plan.id)}
        />
      ))}
    </div>
  );
}

function ListView({
  plans,
  onOpen,
  onReview,
  onDuplicate,
}: {
  plans: Plan[];
  onOpen: (id: string) => void;
  onReview: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <THead>
          <tr>
            <Th align="left">Plan</Th>
            <Th align="left">Client</Th>
            <Th align="left">Date range</Th>
            <Th align="right">Budget</Th>
            <Th align="left">Status</Th>
            <Th align="left">Created</Th>
            <Th align="left">Updated</Th>
            <Th align="left">Owner</Th>
            <Th align="left">Updated by</Th>
            <Th align="right">Actions</Th>
          </tr>
        </THead>
        <TBody>
          {plans.map((plan) => {
            const created = getCreatedEvent(plan);
            const lastEvent = getLastEvent(plan) ?? created;
            return (
              <tr key={plan.id} className="bg-white hover:bg-slate-50">
                <Td>{plan.meta.name}</Td>
                <Td>{plan.meta.client}</Td>
                <Td>{getPlanDateRange(plan)}</Td>
                <Td align="right">{currencyFormatter.format(plan.goal.budget)}</Td>
                <Td>{plan.status}</Td>
                <Td>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-800">{formatDate(created?.timestamp ?? plan.lastModified)}</span>
                    <span className="text-xs text-slate-500">{created?.actor ?? plan.owner}</span>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-800">{formatDate(plan.lastModified)}</span>
                    <span className="text-xs text-slate-500">{lastEvent?.actor ?? plan.owner}</span>
                  </div>
                </Td>
                <Td>{plan.owner}</Td>
                <Td>{lastEvent?.actor ?? plan.owner}</Td>
                <Td align="right">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-end">
                    <Button className="px-3 py-1 text-xs" onClick={() => onOpen(plan.id)}>
                      Open
                    </Button>
                    <Button className="px-3 py-1 text-xs" variant="secondary" onClick={() => onReview(plan.id)}>
                      Review
                    </Button>
                    <Button className="px-3 py-1 text-xs" variant="ghost" onClick={() => onDuplicate(plan.id)}>
                      Duplicate
                    </Button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

export function PlanList({
  plans,
  viewMode = 'grid',
  onOpen,
  onReview,
  onDuplicate,
}: {
  plans: Plan[];
  viewMode?: PlanListView;
  onOpen: (id: string) => void;
  onReview: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  if (plans.length === 0) {
    return <p className="text-sm text-slate-500">No plans yet. Create one to get started.</p>;
  }

  if (viewMode === 'list') {
    return <ListView plans={plans} onOpen={onOpen} onReview={onReview} onDuplicate={onDuplicate} />;
  }

  return <GridView plans={plans} onOpen={onOpen} onReview={onReview} onDuplicate={onDuplicate} />;
}
