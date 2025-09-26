export function differenceInDays(end: string, start: string) {
  const endDate = new Date(end);
  const startDate = new Date(start);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
