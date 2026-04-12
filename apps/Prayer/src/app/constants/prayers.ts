import type { PrayerId } from '@spirit/prayer-feature';

export type PrayerOption = { id: PrayerId; title: string };

export const PRAYER_OPTIONS: PrayerOption[] = [
  { id: 'liturgy', title: 'Божественная литургия' },
  { id: 'vespers', title: 'Вечерня' },
  { id: 'morning_rule', title: 'Утреннее правило' },
  { id: 'evening_rule', title: 'Вечернее правило' },
  { id: 'pascha_hours', title: 'Часы пасхальные' },
  {
    id: 'three_canons',
    title: 'Совмещённые каноны: Покаянный, Богородице, Ангелу Хранителю',
  },
  {
    id: 'communion_evening',
    title: 'Последование ко Святому Причащению (канон)',
  },
  {
    id: 'communion_morning',
    title: 'Последование ко Святому Причащению (молитвы)',
  },
  {
    id: 'communion',
    title: 'Памятка готовящемуся ко Святому Причащению',
  },
  {
    id: 'gratitude',
    title: 'Благодарственные молитвы по Святом Причащении',
  },
  { id: 'akathist_baptist', title: 'Акафист святому Иоанну Крестителю' },
  { id: 'akathist_spiridon', title: 'Акафист святителю Спиридону Тримифунтскому' },
  { id: 'akathist_sergy', title: 'Акафист преподобному Сергию Радонежскому' },
  { id: 'akathist_luka', title: 'Акафист святителю Луке, архиепископу Крымскому, исповеднику' },
];

export const PRAYER_TITLE_BY_ID = PRAYER_OPTIONS.reduce<Record<PrayerId, string>>(
  (acc, cur) => {
    acc[cur.id] = cur.title;
    return acc;
  },
  {
    liturgy: 'Божественная литургия',
    vespers: 'Вечерня',
    morning_rule: 'Утреннее правило',
    evening_rule: 'Вечернее правило',
    pascha_hours: 'Часы пасхальные',
    three_canons: 'Совмещённые каноны: Покаянный, Богородице, Ангелу Хранителю',
    communion_evening: 'Последование ко Святому Причащению (канон)',
    communion_morning: 'Последование ко Святому Причащению (молитвы)',
    communion: 'Памятка готовящемуся ко Святому Причащению',
    gratitude: 'Благодарственные молитвы по Святом Причащении',
    akathist_baptist: 'Акафист святому Иоанну Крестителю',
    akathist_spiridon: 'Акафист святителю Спиридону Тримифунтскому',
    akathist_sergy: 'Акафист преподобному Сергию Радонежскому',
    akathist_luka: 'Акафист святителю Луке, архиепископу Крымскому, исповеднику',
  },
);
