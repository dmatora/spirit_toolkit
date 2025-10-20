import type { PrayerId } from '@spirit/prayer-feature';

export type PrayerLink = {
  id: PrayerId;
  title: string;
  href: string;
};

export const PRAYERS: PrayerLink[] = [
  { id: 'liturgy', title: 'Божественная литургия', href: '/molitvoslov/liturgy' },
  { id: 'evening', title: 'Вечерня', href: '/molitvoslov/evening' },
];
