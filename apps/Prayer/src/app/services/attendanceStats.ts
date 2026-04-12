import { daysBetween, startOfDayLocal } from '@spirit/prayer-feature/utils/date';

export type AttendanceJournalEntry = {
  prayer_id: string;
  timestamp: number;
};

export type AttendanceMetricStats = {
  lastEntryDate: Date | null;
  daysSince: number | null;
  uniqueDaysLast30: number;
};

export const LITURGY_ATTENDANCE_PRAYER_IDS = ['liturgy'] as const;
export const COMMUNION_ATTENDANCE_PRAYER_IDS = ['gratitude'] as const;

export const EMPTY_ATTENDANCE_METRIC_STATS: AttendanceMetricStats = {
  lastEntryDate: null,
  daysSince: null,
  uniqueDaysLast30: 0,
};

export const computeAttendanceMetricStats = (
  rows: AttendanceJournalEntry[],
  prayerIds: readonly string[],
  referenceDate: Date = new Date(),
): AttendanceMetricStats => {
  if (!rows.length || !prayerIds.length) {
    return EMPTY_ATTENDANCE_METRIC_STATS;
  }

  const prayerIdSet = new Set(prayerIds);
  const matchedRows = rows.filter((row) => prayerIdSet.has(row.prayer_id));

  if (!matchedRows.length) {
    return EMPTY_ATTENDANCE_METRIC_STATS;
  }

  const lastTimestampSec = Math.max(...matchedRows.map((row) => row.timestamp));
  const lastEntryDate = new Date(lastTimestampSec * 1000);
  const today = startOfDayLocal(referenceDate);
  const since = new Date(today);
  since.setDate(today.getDate() - 29);

  const uniqueDays = new Set<string>();
  for (const row of matchedRows) {
    const entryDate = startOfDayLocal(new Date(row.timestamp * 1000));
    if (entryDate >= since && entryDate <= today) {
      const key = `${entryDate.getFullYear()}-${entryDate.getMonth() + 1}-${entryDate.getDate()}`;
      uniqueDays.add(key);
    }
  }

  return {
    lastEntryDate,
    daysSince: Math.max(0, daysBetween(lastEntryDate, today)),
    uniqueDaysLast30: uniqueDays.size,
  };
};
