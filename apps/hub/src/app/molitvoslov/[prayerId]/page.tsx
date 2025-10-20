import { notFound } from 'next/navigation';

import type { PrayerId } from '@spirit/prayer-feature/prayer/utils/prayerLoader';

import { PRAYERS, type PrayerLink } from '../prayers';
import PrayerScreenClient from './PrayerScreenClient';

export const generateStaticParams = () =>
  PRAYERS.map(({ id }) => ({
    prayerId: id,
  }));

type PrayerPageProps = {
  params: {
    prayerId: string;
  };
};

const resolvePrayer = (prayerId: string): PrayerLink | undefined => {
  const typedId = prayerId as PrayerId;
  return PRAYERS.find((item) => item.id === typedId);
};

const PrayerPage = ({ params }: PrayerPageProps) => {
  const prayer = resolvePrayer(params.prayerId);

  if (!prayer) {
    notFound();
  }

  return <PrayerScreenClient prayerId={params.prayerId} />;
};

export default PrayerPage;
