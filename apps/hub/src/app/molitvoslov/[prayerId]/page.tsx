import { notFound } from 'next/navigation';

import { loadPrayer, type PrayerId } from '@spirit/prayer-feature/prayer/utils/prayerLoader';

import { PRAYERS, type PrayerLink } from '../prayers';
import PrayerContent from './PrayerContent';

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

const PrayerPage = async ({ params }: PrayerPageProps) => {
  const prayer = resolvePrayer(params.prayerId);

  if (!prayer) {
    notFound();
  }

  const blocks = await loadPrayer(prayer.id);

  return <PrayerContent prayer={prayer} blocks={blocks} />;
};

export default PrayerPage;
