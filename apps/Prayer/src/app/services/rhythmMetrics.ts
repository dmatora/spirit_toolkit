import {
  daysBetween,
  startOfDayLocal,
} from '@spirit/prayer-feature/utils/date';

import {
  COMMUNION_ATTENDANCE_PRAYER_IDS,
  LITURGY_ATTENDANCE_PRAYER_IDS,
  type AttendanceJournalEntry,
} from './attendanceStats';

export type RhythmTrackId = 'liturgy' | 'communion';
export type RhythmStatus = 'fresh' | 'warning' | 'danger';

export type RhythmWeekBase = {
  index: number;
  key: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isFuture: boolean;
};

export type RhythmTrackWeekModel = RhythmWeekBase & {
  status: RhythmStatus;
  daysSince: number;
  hasEventThisWeek: boolean;
};

export type RhythmTrackModel = {
  id: RhythmTrackId;
  title: string;
  prayerIds: readonly string[];
  weeks: RhythmTrackWeekModel[];
  lastEntryDate: Date | null;
  currentDaysSince: number;
  currentStatus: RhythmStatus;
  eventWeeksCount: number;
};

export type RhythmModel = {
  rangeLabel: string;
  visibleMonthCount: number;
  totalWeeks: number;
  elapsedWeeks: number;
  currentWeek: RhythmWeekBase;
  tracks: RhythmTrackModel[];
};

export type YearlyRhythmModel = RhythmModel;

type RhythmTrackDefinition = Pick<
  RhythmTrackModel,
  'id' | 'title' | 'prayerIds'
>;

export const RHYTHM_THRESHOLDS = {
  fresh: 7,
  warning: 30,
} as const;

const RHYTHM_TRACKS: RhythmTrackDefinition[] = [
  {
    id: 'communion',
    title: 'Причастие',
    prayerIds: COMMUNION_ATTENDANCE_PRAYER_IDS,
  },
  {
    id: 'liturgy',
    title: 'Литургия',
    prayerIds: LITURGY_ATTENDANCE_PRAYER_IDS,
  },
];

const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return startOfDayLocal(nextDate);
};

const startOfMonthLocal = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const startOfWeekLocal = (date: Date): Date => {
  const normalized = startOfDayLocal(date);
  const weekday = normalized.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  normalized.setDate(normalized.getDate() + offset);
  return normalized;
};

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const resolveRhythmStatus = (daysSince: number): RhythmStatus => {
  if (daysSince <= RHYTHM_THRESHOLDS.fresh) {
    return 'fresh';
  }
  if (daysSince <= RHYTHM_THRESHOLDS.warning) {
    return 'warning';
  }
  return 'danger';
};

const buildWeeksForRange = (referenceDate: Date, rangeStart: Date) => {
  const normalizedReferenceDate = startOfDayLocal(referenceDate);
  const currentWeekStart = startOfWeekLocal(referenceDate);

  const weeks: RhythmWeekBase[] = [];
  let cursor = startOfWeekLocal(rangeStart);

  while (cursor <= normalizedReferenceDate) {
    const weekStart = startOfDayLocal(cursor);
    const weekEnd = addDays(weekStart, 6);
    const visibleEnd =
      weekEnd > normalizedReferenceDate ? normalizedReferenceDate : weekEnd;

    weeks.push({
      index: weeks.length,
      key: toDateKey(weekStart),
      startDate: weekStart < rangeStart ? rangeStart : weekStart,
      endDate: visibleEnd,
      isCurrent: weekStart.getTime() === currentWeekStart.getTime(),
      isFuture: false,
    });
    cursor = addDays(weekStart, 7);
  }

  return {
    weeks,
  };
};

const buildTrackModel = (
  definition: RhythmTrackDefinition,
  rows: AttendanceJournalEntry[],
  weeks: RhythmWeekBase[],
  referenceDate: Date,
  trackingStart: Date
): RhythmTrackModel => {
  const prayerIdSet = new Set(definition.prayerIds);
  const matchedDates = rows
    .filter((row) => prayerIdSet.has(row.prayer_id))
    .map((row) => startOfDayLocal(new Date(row.timestamp * 1000)))
    .sort((left, right) => left.getTime() - right.getTime());

  let entryPointer = 0;
  let lastSeenDate: Date | null = null;

  const trackWeeks = weeks.map((week) => {
    let hasEventThisWeek = false;

    while (
      entryPointer < matchedDates.length &&
      matchedDates[entryPointer].getTime() <= week.endDate.getTime()
    ) {
      lastSeenDate = matchedDates[entryPointer];
      if (matchedDates[entryPointer].getTime() >= week.startDate.getTime()) {
        hasEventThisWeek = true;
      }
      entryPointer += 1;
    }

    const anchorDate = lastSeenDate ?? trackingStart;
    const inferredDaysSince = Math.max(0, daysBetween(anchorDate, week.endDate));
    const daysSince = lastSeenDate
      ? inferredDaysSince
      : Math.max(RHYTHM_THRESHOLDS.warning + 1, inferredDaysSince);
    const status = lastSeenDate ? resolveRhythmStatus(daysSince) : 'danger';

    return {
      ...week,
      status,
      daysSince,
      hasEventThisWeek,
    };
  });

  const currentLastEntryDate =
    matchedDates
      .filter(
        (entryDate) =>
          entryDate.getTime() <= startOfDayLocal(referenceDate).getTime()
      )
      .at(-1) ?? null;
  const currentAnchorDate = currentLastEntryDate ?? trackingStart;
  const inferredCurrentDaysSince = Math.max(
    0,
    daysBetween(currentAnchorDate, referenceDate)
  );
  const currentDaysSince = currentLastEntryDate
    ? inferredCurrentDaysSince
    : Math.max(RHYTHM_THRESHOLDS.warning + 1, inferredCurrentDaysSince);
  const currentStatus = currentLastEntryDate
    ? resolveRhythmStatus(currentDaysSince)
    : 'danger';

  return {
    ...definition,
    weeks: trackWeeks,
    lastEntryDate: currentLastEntryDate,
    currentDaysSince,
    currentStatus,
    eventWeeksCount: trackWeeks.filter((week) => week.hasEventThisWeek).length,
  };
};

const formatRangeLabel = (rangeStart: Date, referenceDate: Date): string => {
  const startYear = rangeStart.getFullYear();
  const endYear = referenceDate.getFullYear();
  const startLabel = rangeStart.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
  const endLabel = referenceDate.toLocaleDateString('ru-RU', {
    month: 'long',
    year: startYear === endYear ? undefined : 'numeric',
  });

  return `${startLabel} - ${endLabel}`;
};

const countVisibleMonths = (rangeStart: Date, referenceDate: Date): number =>
  (referenceDate.getFullYear() - rangeStart.getFullYear()) * 12 +
  (referenceDate.getMonth() - rangeStart.getMonth()) +
  1;

export const buildYearlyRhythmModel = (
  rows: AttendanceJournalEntry[],
  referenceDate: Date = new Date()
): RhythmModel => {
  const normalizedReferenceDate = startOfDayLocal(referenceDate);
  const defaultRangeStart = startOfMonthLocal(
    new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 11, 1)
  );
  const earliestEntryDate =
    rows.length > 0
      ? rows
          .map((row) => startOfDayLocal(new Date(row.timestamp * 1000)))
          .sort((left, right) => left.getTime() - right.getTime())[0]
      : null;
  const rangeStart = earliestEntryDate
    ? startOfMonthLocal(
        earliestEntryDate > defaultRangeStart
          ? earliestEntryDate
          : defaultRangeStart
      )
    : startOfMonthLocal(referenceDate);
  const { weeks } = buildWeeksForRange(normalizedReferenceDate, rangeStart);
  const currentWeek =
    weeks.find((week) => week.isCurrent) ??
    weeks[Math.min(weeks.length - 1, Math.max(0, weeks.length - 1))];

  return {
    rangeLabel: formatRangeLabel(rangeStart, normalizedReferenceDate),
    visibleMonthCount: countVisibleMonths(rangeStart, normalizedReferenceDate),
    totalWeeks: weeks.length,
    elapsedWeeks: weeks.length,
    currentWeek,
    tracks: RHYTHM_TRACKS.map((track) =>
      buildTrackModel(
        track,
        rows,
        weeks,
        normalizedReferenceDate,
        rangeStart
      )
    ),
  };
};
