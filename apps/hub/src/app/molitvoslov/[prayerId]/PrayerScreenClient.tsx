'use client';

import React, { useEffect, useRef } from 'react';
import { PrayerScreen, type PrayerId } from '@spirit/prayer-feature';
import { recordPrayerActivity } from '@spirit/prayer-feature/prayer/services/prayerActivityState';

import { addJournalEntry } from '../../../../../Prayer/src/app/services/journalDb.web';
import { triggerSync } from '../../../../../Prayer/src/app/services/journalSync.web';

type Props = { prayerId: string };

const shouldSkipStrictEffectGuard =
  process.env.NODE_ENV !== 'production';

export default function PrayerScreenClient({ prayerId }: Props) {
  const id = (prayerId as PrayerId) ?? 'liturgy';
  const skipStrictEffectRef = useRef(shouldSkipStrictEffectGuard);
  const lastScrollActivityRef = useRef(0);

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
          triggerSync();
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
  }, [id, recordPrayerActivity]);

  useEffect(() => {
    if (id === 'liturgy' || id === 'vespers') {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollActivityRef.current < 1000) {
        return;
      }
      lastScrollActivityRef.current = now;
      recordPrayerActivity(now);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [id]);

  return (
    <PrayerScreen
      prayerId={id}
      scrollSource="external"
    />
  );
}
