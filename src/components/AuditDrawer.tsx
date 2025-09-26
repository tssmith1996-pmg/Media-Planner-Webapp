import type { ApprovalEvent } from '@/lib/schemas';
import { formatDate } from '@/lib/date';

export function AuditDrawer({ events }: { events: ApprovalEvent[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">Audit Trail</h3>
      <ol className="mt-3 space-y-2 text-sm text-slate-600">
        {events.map((event) => (
          <li key={event.id} className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{event.action}</span>
              <span className="text-xs text-slate-400">{formatDate(event.timestamp)}</span>
            </div>
            <p className="text-xs text-slate-500">{event.actor}</p>
            {event.comment ? <p className="text-xs text-slate-500">{event.comment}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
