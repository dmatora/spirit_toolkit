import { daysBetween, localDateFromUTCDate, startOfDayLocal } from './date';
import { orthodoxEaster } from './feasts/calc';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type MajorFastId = 'great-lent' | 'apostles-fast' | 'dormition-fast' | 'nativity-fast';

export interface MajorFast {
  id: MajorFastId;
  titleRu: string;
  startDate: Date;
}

const FAST_TITLES: Record<MajorFastId, string> = {
  'great-lent': 'Великий пост',
  'apostles-fast': 'Петров пост',
  'dormition-fast': 'Успенский пост',
  'nativity-fast': 'Рождественский пост',
};

function addDaysLocal(date: Date, days: number): Date {
  return startOfDayLocal(new Date(date.getTime() + days * MS_PER_DAY));
}

function generateMajorFastsForYear(year: number): MajorFast[] {
  const easterLocal = localDateFromUTCDate(orthodoxEaster(year));

  return [
    {
      id: 'great-lent',
      titleRu: FAST_TITLES['great-lent'],
      // Clean Monday is 48 days before Pascha (40 days of Lent + Holy Week).
      startDate: addDaysLocal(easterLocal, -48),
    },
    {
      id: 'apostles-fast',
      titleRu: FAST_TITLES['apostles-fast'],
      // Apostles' Fast starts on the Monday after All Saints Sunday (57 days after Pascha).
      startDate: addDaysLocal(easterLocal, 57),
    },
    {
      id: 'dormition-fast',
      titleRu: FAST_TITLES['dormition-fast'],
      // Dormition Fast is fixed: August 14 (Aug 1 Julian), converted to civil calendar.
      startDate: startOfDayLocal(new Date(year, 7, 14)),
    },
    {
      id: 'nativity-fast',
      titleRu: FAST_TITLES['nativity-fast'],
      // Nativity Fast always begins on November 28 (Nov 15 Julian) in the civil calendar.
      startDate: startOfDayLocal(new Date(year, 10, 28)),
    },
  ];
}

export function getNextMajorFast(referenceDate: Date = new Date()): { fast: MajorFast; daysLeft: number } {
  const pivot = startOfDayLocal(referenceDate);
  const year = pivot.getFullYear();
  const fasts = [...generateMajorFastsForYear(year), ...generateMajorFastsForYear(year + 1)];

  const upcoming = fasts.find((fast) => fast.startDate.getTime() >= pivot.getTime());

  if (!upcoming) {
    throw new Error('Unable to locate upcoming fast');
  }

  return {
    fast: upcoming,
    daysLeft: Math.max(0, daysBetween(pivot, upcoming.startDate)),
  };
}
