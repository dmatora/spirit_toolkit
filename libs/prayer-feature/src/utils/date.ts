const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(a: Date, b: Date): number {
  const start = startOfDayLocal(a).getTime();
  const end = startOfDayLocal(b).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

export function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function localDateFromUTCDate(d: Date): Date {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function daysBetweenUTC(a: Date, b: Date): number {
  const start = startOfDayUTC(a).getTime();
  const end = startOfDayUTC(b).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

export function withUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}
