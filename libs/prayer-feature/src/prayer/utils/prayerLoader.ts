import type { PrayerBlock } from '../types/prayer';

export type PrayerId =
  | 'liturgy'
  | 'vespers'
  | 'morning_rule'
  | 'evening_rule'
  | 'akathist_baptist'
  | 'akathist_spiridon'
  | 'akathist_sergy'
  | 'akathist_luka';

const cache: Partial<Record<PrayerId, PrayerBlock[]>> = {};

export async function loadPrayer(prayerId: PrayerId): Promise<PrayerBlock[]> {
  const resolvedId: PrayerId =
    prayerId === 'liturgy' ||
    prayerId === 'vespers' ||
    prayerId === 'morning_rule' ||
    prayerId === 'evening_rule' ||
    prayerId === 'akathist_baptist' ||
    prayerId === 'akathist_spiridon' ||
    prayerId === 'akathist_sergy' ||
    prayerId === 'akathist_luka'
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
          case 'morning_rule':
            data = require('../assets/prayers/morning_rule.json');
            break;
          case 'evening_rule':
            data = require('../assets/prayers/evening_rule.json');
            break;
          case 'akathist_baptist':
            data = require('../assets/prayers/akathist_baptist.json');
            break;
          case 'akathist_spiridon':
            data = require('../assets/prayers/akathist_spiridon.json');
            break;
          case 'akathist_sergy':
            data = require('../assets/prayers/akathist_sergy.json');
            break;
          case 'akathist_luka':
            data = require('../assets/prayers/akathist_luka.json');
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
