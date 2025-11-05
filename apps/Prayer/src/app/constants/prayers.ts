import type { PrayerId } from '@spirit/prayer-feature';

export type PrayerOption = { id: PrayerId; title: string };

export const PRAYER_OPTIONS: PrayerOption[] = [
  { id: 'liturgy', title: 'Божественная литургия' },
  { id: 'vespers', title: 'Вечерня' },
  { id: 'akathist_baptist', title: 'Акафист святому Иоанну Крестителю' },
  { id: 'akathist_spiridon', title: 'Акафист святителю Спиридону Тримифунтскому' },
  { id: 'akathist_sergy', title: 'Акафист преподобному Сергию Радонежскому' },
];

export const PRAYER_TITLE_BY_ID = PRAYER_OPTIONS.reduce<Record<PrayerId, string>>(
  (acc, cur) => {
    acc[cur.id] = cur.title;
    return acc;
  },
  {
    liturgy: 'Божественная литургия',
    vespers: 'Вечерня',
    akathist_baptist: 'Акафист святому Иоанну Крестителю',
    akathist_spiridon: 'Акафист святителю Спиридону Тримифунтскому',
    akathist_sergy: 'Акафист преподобному Сергию Радонежскому',
  },
);
