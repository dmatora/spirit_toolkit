import { daysBetween, startOfDayLocal, startOfDayUTC, withUTC } from '../date';
import { MAJOR_FEAST_RULES } from './rules';
import { Feast, FeastRule } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function julianToGregorianShift(year: number): number {
  return Math.floor(year / 100) - Math.floor(year / 400) - 2;
}

function julianToGregorianShiftForDate(year: number, month: number, day: number): number {
  const isBeforeMarchFirst = month === 1 || month === 2 || (month === 3 && day < 1);

  if (isBeforeMarchFirst) {
    return julianToGregorianShift(year - 1);
  }

  return julianToGregorianShift(year);
}

/**
 * Computes the Gregorian date of Orthodox Pascha for the provided year.
 */
export function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 => March, 4 => April
  const day = ((d + e + 114) % 31) + 1;

  const julianPascha = withUTC(year, month, day);
  const shift = julianToGregorianShift(year);
  return startOfDayUTC(addDaysUTC(julianPascha, shift));
}

/**
 * Calculates the civil date of a major feast according to its rule.
 */
export function materializeFeast(year: number, rule: FeastRule): Feast {
  if (rule.kind === 'relativeToEaster') {
    const easter = orthodoxEaster(year);
    return {
      key: rule.key,
      titleRu: rule.titleRu,
      date: startOfDayLocal(addDaysUTC(easter, rule.offsetDays)),
    };
  }

  if (rule.calendar === 'gregorian') {
    return {
      key: rule.key,
      titleRu: rule.titleRu,
      date: startOfDayLocal(new Date(year, rule.month - 1, rule.day)),
    };
  }

  const julianDate = withUTC(year, rule.month, rule.day);
  const shift = julianToGregorianShiftForDate(year, rule.month, rule.day);
  const shifted = addDaysUTC(julianDate, shift);
  return {
    key: rule.key,
    titleRu: rule.titleRu,
    date: startOfDayLocal(shifted),
  };
}

/**
 * Expands all major feast rules into concrete dates for the given year.
 */
export function generateMajorFeasts(year: number): Feast[] {
  return MAJOR_FEAST_RULES.map((rule) => materializeFeast(year, rule)).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

/**
 * Finds the next major feast (including today) relative to the provided date.
 *
 * @example
 * ```ts
 * const { feast } = getNextMajorFeast(new Date('2024-04-29T10:00:00Z'));
 * // feast.key === 'ascension'
 * ```
 */
export function getNextMajorFeast(from: Date = new Date()): {
  feast: Feast;
  daysLeft: number;
} {
  const pivot = startOfDayLocal(from);
  const currentYear = pivot.getFullYear();
  const feastsCurrent = generateMajorFeasts(currentYear);

  const upcoming =
    feastsCurrent.find((feast) => feast.date.getTime() >= pivot.getTime()) ??
    generateMajorFeasts(currentYear + 1)[0];

  return {
    feast: upcoming,
    daysLeft: daysBetween(pivot, upcoming.date),
  };
}
