import type { PrayerBlock } from '../types/prayer';

export type PrayerId =
  | 'liturgy'
  | 'vespers'
  | 'akathist_baptist'
  | 'akathist_spiridon';

const cache: Partial<Record<PrayerId, PrayerBlock[]>> = {};

export async function loadPrayer(prayerId: PrayerId): Promise<PrayerBlock[]> {
  const resolvedId: PrayerId =
    prayerId === 'liturgy' ||
    prayerId === 'vespers' ||
    prayerId === 'akathist_baptist' ||
    prayerId === 'akathist_spiridon'
      ? prayerId
      : 'liturgy';

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
          case 'akathist_baptist':
            data = require('../assets/prayers/akathist_baptist.json');
            break;
          case 'akathist_spiridon':
            data = require('../assets/prayers/akathist_spiridon.json');
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
