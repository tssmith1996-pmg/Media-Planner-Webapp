const LOCALE = 'en-AU';

export type WeekStartDay = 'Sunday' | 'Monday';

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

export function startOfWeek(input: Date, weekStart: WeekStartDay) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  const currentDay = date.getDay();
  const weekStartIndex = weekStart === 'Monday' ? 1 : 0;
  const diff = (currentDay - weekStartIndex + 7) % 7;
  date.setDate(date.getDate() - diff);
  return date;
}

export function endOfWeek(input: Date, weekStart: WeekStartDay) {
  const start = startOfWeek(input, weekStart);
  start.setDate(start.getDate() + 6);
  return start;
}

export function startOfWeekSunday(input: Date) {
  return startOfWeek(input, 'Sunday');
}

export function endOfWeekSaturday(input: Date) {
  return endOfWeek(input, 'Sunday');
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

export function enumerateWeeksRange(start: Date, end: Date, weekStart: WeekStartDay) {
  const weeks: { start: Date; end: Date; key: string }[] = [];
  let cursor = startOfWeek(start, weekStart);
  const limit = startOfWeek(end, weekStart);
  while (cursor.getTime() <= limit.getTime()) {
    const weekStartDate = new Date(cursor);
    const weekEndDate = endOfWeek(weekStartDate, weekStart);
    weeks.push({ start: weekStartDate, end: weekEndDate, key: toIsoDate(weekStartDate) });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function enumerateWeeks(start: Date, end: Date) {
  return enumerateWeeksRange(start, end, 'Sunday');
}

export function enumeratePlanWeeks(start: string, end: string, weekStart: WeekStartDay) {
  return enumerateWeeksRange(new Date(start), new Date(end), weekStart);
}
