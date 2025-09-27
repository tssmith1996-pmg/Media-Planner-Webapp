const LOCALE = 'en-AU';

export function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric' });
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
}

export function startOfWeekSunday(input: Date) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? 0 : day;
  date.setDate(date.getDate() - diff);
  return date;
}

export function endOfWeekSaturday(input: Date) {
  const start = startOfWeekSunday(input);
  start.setDate(start.getDate() + 6);
  return start;
}

export function addDays(input: Date, amount: number) {
  const date = new Date(input);
  date.setDate(date.getDate() + amount);
  return date;
}

export function toIsoDate(input: Date) {
  const copy = new Date(input);
  copy.setHours(0, 0, 0, 0);
  const offsetMinutes = copy.getTimezoneOffset();
  const adjusted = new Date(copy.getTime() - offsetMinutes * 60 * 1000);
  return adjusted.toISOString().slice(0, 10);
}

export function enumerateWeeks(start: Date, end: Date) {
  const weeks: { start: Date; end: Date; key: string }[] = [];
  let cursor = startOfWeekSunday(start);
  const limit = startOfWeekSunday(end);
  while (cursor.getTime() <= limit.getTime()) {
    const weekStart = new Date(cursor);
    const weekEnd = endOfWeekSaturday(weekStart);
    weeks.push({ start: weekStart, end: weekEnd, key: toIsoDate(weekStart) });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}
