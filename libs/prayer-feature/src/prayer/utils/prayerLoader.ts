import type { PrayerBlock } from '../types/prayer';

export type PrayerId = 'liturgy' | 'vespers';

const cache: Partial<Record<PrayerId, PrayerBlock[]>> = {};

export async function loadPrayer(prayerId: PrayerId): Promise<PrayerBlock[]> {
  const resolvedId: PrayerId =
    prayerId === 'liturgy' || prayerId === 'vespers' ? prayerId : 'liturgy';

  const cachedBlocks = cache[resolvedId];
  if (cachedBlocks) {
    return cachedBlocks;
  }

  return new Promise<PrayerBlock[]>((resolve, reject) => {
    setTimeout(() => {
      try {
        let data: PrayerBlock[];

        switch (resolvedId) {
          case 'liturgy':
            data = require('../assets/prayers/liturgy.json');
            break;
          case 'vespers':
            data = require('../assets/prayers/vespers.json');
            break;
          default:
            data = require('../assets/prayers/liturgy.json');
            break;
        }

        cache[resolvedId] = data;
        resolve(data);
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
}
