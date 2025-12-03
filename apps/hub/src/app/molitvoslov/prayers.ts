import type { PrayerId } from '@spirit/prayer-feature';

export type PrayerLink = {
  id: PrayerId;
  title: string;
  href: string;
};

export const PRAYERS: PrayerLink[] = [
  { id: 'liturgy', title: 'Божественная литургия', href: '/molitvoslov/liturgy' },
  { id: 'vespers', title: 'Вечерня', href: '/molitvoslov/vespers' },
  { id: 'morning_rule', title: 'Утреннее правило', href: '/molitvoslov/morning_rule' },
  { id: 'evening_rule', title: 'Вечернее правило', href: '/molitvoslov/evening_rule' },
  {
    id: 'three_canons',
    title: 'Совмещённые каноны: Покаянный, Богородице, Ангелу Хранителю',
    href: '/molitvoslov/three_canons',
  },
  {
    id: 'communion_evening',
    title: 'Последование ко Святому Причащению (канон)',
    href: '/molitvoslov/communion_evening',
  },
  {
    id: 'communion_morning',
    title: 'Последование ко Святому Причащению (молитвы)',
    href: '/molitvoslov/communion_morning',
  },
  {
    id: 'communion',
    title: 'Памятка готовящемуся ко Святому Причащению',
    href: '/molitvoslov/communion',
  },
  {
    id: 'gratitude',
    title: 'Благодарственные молитвы по Святом Причащении',
    href: '/molitvoslov/gratitude',
  },
  {
    id: 'akathist_baptist',
    title: 'Акафист святому Иоанну Крестителю',
    href: '/molitvoslov/akathist_baptist',
  },
  {
    id: 'akathist_spiridon',
    title: 'Акафист святителю Спиридону Тримифунтскому',
    href: '/molitvoslov/akathist_spiridon',
  },
  {
    id: 'akathist_sergy',
    title: 'Акафист преподобному Сергию Радонежскому',
    href: '/molitvoslov/akathist_sergy',
  },
  {
    id: 'akathist_luka',
    title: 'Акафист святителю Луке, архиепископу Крымскому, исповеднику',
    href: '/molitvoslov/akathist_luka',
  },
];
