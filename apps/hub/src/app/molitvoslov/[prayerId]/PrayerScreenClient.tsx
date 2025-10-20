'use client';

import React from 'react';
import { PrayerScreen, type PrayerId } from '@spirit/prayer-feature';

type Props = { prayerId: string };

export default function PrayerScreenClient({ prayerId }: Props) {
  const id = (prayerId as PrayerId) ?? 'liturgy';
  return <PrayerScreen prayerId={id} />;
}
