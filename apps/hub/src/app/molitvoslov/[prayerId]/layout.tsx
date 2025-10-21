import React from 'react';
import { PRAYERS, type PrayerLink } from '../prayers';
import type { PrayerId } from '@spirit/prayer-feature';
import PrayerDrawerLayoutClient from './PrayerDrawerLayoutClient';

type LayoutProps = {
  children: React.ReactNode;
  params: { prayerId: string };
};

const Layout = ({ children, params }: LayoutProps) => {
  const id = (params?.prayerId as PrayerId | undefined) ?? 'liturgy';
  const currentPrayer: PrayerLink = PRAYERS.find((prayer) => prayer.id === id) ?? PRAYERS[0];

  return (
    <PrayerDrawerLayoutClient currentPrayer={currentPrayer} prayers={PRAYERS}>
      {children}
    </PrayerDrawerLayoutClient>
  );
};

export default Layout;
