import { daysBetween, localDateFromUTCDate, startOfDayLocal, startOfDayUTC, withUTC } from '../date';
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
  const isBeforeMarchFirst = month < 3;
  if (isBeforeMarchFirst) {
    return julianToGregorianShift(year - 1);
  }
  return julianToGregorianShift(year);
}

export function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;

  const julianPascha = withUTC(year, month, day);
  const shift = julianToGregorianShift(year);
  return startOfDayUTC(addDaysUTC(julianPascha, shift));
}

export function materializeFeast(year: number, rule: FeastRule): Feast {
  if (rule.kind === 'relativeToEaster') {
    const easter = orthodoxEaster(year);
    const shiftedUTC = addDaysUTC(easter, rule.offsetDays);
    return {
      key: rule.key,
      titleRu: rule.titleRu,
      date: localDateFromUTCDate(shiftedUTC),
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
    date: localDateFromUTCDate(shifted),
  };
}

export function generateMajorFeasts(year: number): Feast[] {
  return MAJOR_FEAST_RULES.map((rule) => materializeFeast(year, rule)).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

export function getNextMajorFeast(from: Date = new Date()): { feast: Feast; daysLeft: number } {
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
