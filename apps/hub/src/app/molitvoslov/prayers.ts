import type { PrayerId } from '@spirit/prayer-feature';

export type PrayerLink = {
  id: PrayerId;
  title: string;
  href: string;
};

export const PRAYERS: PrayerLink[] = [
  { id: 'liturgy', title: 'Божественная литургия', href: '/molitvoslov/liturgy' },
  { id: 'vespers', title: 'Вечерня', href: '/molitvoslov/vespers' },
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
];
