import React, { useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import { PrayerScreen as BasePrayerScreen, type PrayerId } from '@spirit/prayer-feature';

import { addJournalEntry } from '../services/journalDb';

type Props = React.ComponentProps<typeof BasePrayerScreen>;

const PrayerScreen = (props: Props) => {
  const route = useRoute();
  const routePrayerId = ((route?.params ?? {}) as { prayerId?: PrayerId }).prayerId;
  const resolvedId = (props.prayerId ?? routePrayerId ?? 'liturgy') as PrayerId;

  useEffect(() => {
    addJournalEntry(resolvedId)
      .then(() => console.log(`[PrayerScreen] journal entry added for '${resolvedId}'`))
      .catch((e) => console.error('[PrayerScreen] failed to add journal entry', e));
  }, [resolvedId]);

  return <BasePrayerScreen {...props} prayerId={resolvedId} />;
};

export default PrayerScreen;
