import { useEffect, useMemo, useState } from 'react';
import type { ChannelFlighting } from '@/api/plans';
import { Modal } from '@/ui/Modal';
import { Button } from '@/ui/Button';
import { addDays, enumerateWeeks, formatDateRange, toIsoDate } from '@/lib/date';

export function FlightingScheduleDialog({
  flighting,
  open,
  onClose,
  onSave,
}: {
  flighting: ChannelFlighting | null;
  open: boolean;
  onClose: () => void;
  onSave: (flightId: string, periods: { start: string; end: string }[]) => Promise<void> | void;
}) {
  const flight = flighting?.flight;
  const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !flight) return;
    const initial = new Set<string>();
    const basePeriods =
      flight.active_periods_json && flight.active_periods_json.length > 0
        ? flight.active_periods_json
        : [{ start: flight.start_date, end: flight.end_date }];
    for (const period of basePeriods) {
      const weeks = enumerateWeeks(new Date(period.start), new Date(period.end));
      weeks.forEach((week) => initial.add(week.key));
    }
    setSelectedWeeks(initial);
  }, [flight, open]);

  const weeks = useMemo(() => {
    if (!flight) return [] as ReturnType<typeof enumerateWeeks>;
    return enumerateWeeks(new Date(flight.start_date), new Date(flight.end_date));
  }, [flight]);

  if (!open || !flighting || !flight) {
    return null;
  }

  const handleToggle = (weekKey: string) => {
    setSelectedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekKey)) {
        next.delete(weekKey);
      } else {
        next.add(weekKey);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedWeeks.size === 0) return;
    setSaving(true);
    const periods = derivePeriods(weeks, selectedWeeks, flight.start_date, flight.end_date);
    try {
      await onSave(flight.flight_id, periods);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const vendorName = flighting.vendor?.name ?? 'Flighting';
  const channelName = flighting.lineItem.channel.replace(/_/g, ' ');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Schedule ${vendorName}`}
      description={`Select the weeks ${channelName} should be in market. Unselected weeks will be treated as a dark period.`}
      footer={
        <div className="flex justify-between gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving || selectedWeeks.size === 0} onClick={handleSave}>
            Save schedule
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Toggle weeks to reflect pulsing or hiatus periods. Flight start and end dates remain unchanged.
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {weeks.map((week) => {
            const weekStart = new Date(Math.max(week.start.getTime(), new Date(flight.start_date).getTime()));
            const weekEnd = new Date(Math.min(week.end.getTime(), new Date(flight.end_date).getTime()));
            const label = formatDateRange(toIsoDate(weekStart), toIsoDate(weekEnd));
            const checked = selectedWeeks.has(week.key);
            return (
              <li key={week.key}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-indigo-400">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={checked}
                    onChange={() => handleToggle(week.key)}
                  />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}

function derivePeriods(
  weeks: ReturnType<typeof enumerateWeeks>,
  selection: Set<string>,
  flightStart: string,
  flightEnd: string,
) {
  const activeWeeks = weeks
    .filter((week) => selection.has(week.key))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const periods: { start: string; end: string }[] = [];
  if (activeWeeks.length === 0) return periods;

  let currentStart = new Date(activeWeeks[0].start);
  let currentEnd = new Date(activeWeeks[0].end);

  for (let index = 1; index < activeWeeks.length; index += 1) {
    const week = activeWeeks[index];
    const previousEndPlusOne = addDays(currentEnd, 1);
    if (week.start.getTime() <= previousEndPlusOne.getTime()) {
      currentEnd = new Date(week.end);
    } else {
      periods.push({
        start: toIsoDate(clampDate(currentStart, new Date(flightStart), new Date(flightEnd))),
        end: toIsoDate(clampDate(currentEnd, new Date(flightStart), new Date(flightEnd))),
      });
      currentStart = new Date(week.start);
      currentEnd = new Date(week.end);
    }
  }

  periods.push({
    start: toIsoDate(clampDate(currentStart, new Date(flightStart), new Date(flightEnd))),
    end: toIsoDate(clampDate(currentEnd, new Date(flightStart), new Date(flightEnd))),
  });

  return periods;
}

function clampDate(value: Date, min: Date, max: Date) {
  return new Date(Math.min(Math.max(value.getTime(), min.getTime()), max.getTime()));
}
