import type { PrayerId } from '@spirit/prayer-feature';

export type PrayerOption = { id: PrayerId; title: string };

export const PRAYER_OPTIONS: PrayerOption[] = [
  { id: 'liturgy', title: 'Божественная литургия' },
  { id: 'vespers', title: 'Вечерня' },
];

export const PRAYER_TITLE_BY_ID = PRAYER_OPTIONS.reduce<Record<PrayerId, string>>(
  (acc, cur) => {
    acc[cur.id] = cur.title;
    return acc;
  },
  { liturgy: 'Божественная литургия', vespers: 'Вечерня' },
);
