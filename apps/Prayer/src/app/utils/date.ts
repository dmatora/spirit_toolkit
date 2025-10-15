const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns a copy of the given date truncated to 00:00:00 UTC.
 */
export function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Computes the difference in full UTC days between two dates.
 */
export function daysBetweenUTC(a: Date, b: Date): number {
  const start = startOfDayUTC(a).getTime();
  const end = startOfDayUTC(b).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

/**
 * Constructs a Date for the provided year, month (1-based), and day in UTC.
 */
export function withUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}
