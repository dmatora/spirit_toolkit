const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns the date truncated to local midnight.
 */
export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Computes the difference in full days using local midnight boundaries.
 */
export function daysBetween(a: Date, b: Date): number {
  const start = startOfDayLocal(a).getTime();
  const end = startOfDayLocal(b).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

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
