'use client';

import React, { useEffect, useRef } from 'react';
import { PrayerScreen, type PrayerId } from '@spirit/prayer-feature';

import { addJournalEntry } from '../../../../../Prayer/src/app/services/journalDb.web';

type Props = { prayerId: string };

const shouldSkipStrictEffectGuard =
  process.env.NODE_ENV !== 'production';

export default function PrayerScreenClient({ prayerId }: Props) {
  const id = (prayerId as PrayerId) ?? 'liturgy';
  const skipStrictEffectRef = useRef(shouldSkipStrictEffectGuard);

  useEffect(() => {
    if (skipStrictEffectRef.current) {
      return () => {
        skipStrictEffectRef.current = false;
      };
    }

    let cancelled = false;

    addJournalEntry(id)
      .then(() => {
        if (!cancelled) {
          console.log(
            `[PrayerScreen:web] journal entry added for '${id}'`,
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn('[PrayerScreen:web] failed to add journal entry', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <PrayerScreen
      prayerId={id}
      scrollSource="external"
    />
  );
}
