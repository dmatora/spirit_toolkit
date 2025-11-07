import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { palette } from '@spirit/prayer-feature/theme';

import { pluralizeHoursRu, pluralizeMinutesRu } from '../../utils/plural';
import {
  getPrayerActivityThresholds,
  type PrayerActivityThresholds,
} from '../services/prayerActivityConfig';
import {
  getLastPrayerActivitySync,
  hydratePrayerActivityFromStorage,
  subscribeToPrayerActivity,
} from '../services/prayerActivityState';

const REFRESH_INTERVAL_MS = 30000;

type Props = {
  style?: StyleProp<ViewStyle>;
};

const PrayerActivityIndicator: React.FC<Props> = ({ style }) => {
  const [thresholds, setThresholds] = React.useState<PrayerActivityThresholds | null>(null);
  const [lastActivity, setLastActivity] = React.useState<number | null>(getLastPrayerActivitySync());
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToPrayerActivity((timestamp) => {
      if (isMounted) {
        setLastActivity(timestamp);
      }
    });

    const intervalId = setInterval(() => {
      if (isMounted) {
        setNow(Date.now());
      }
    }, REFRESH_INTERVAL_MS);

    const hydrate = async () => {
      try {
        const [, loadedThresholds] = await Promise.all([
          hydratePrayerActivityFromStorage(),
          getPrayerActivityThresholds(),
        ]);

        if (!isMounted) {
          return;
        }

        setThresholds(loadedThresholds);
        setLastActivity(getLastPrayerActivitySync());
      } catch (error) {
        console.warn('[PrayerActivityIndicator]', error);
      }
    };

    hydrate();

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      unsubscribe();
    };
  }, []);

  if (!thresholds || lastActivity == null) {
    return null;
  }

  const diffMs = Math.max(0, now - lastActivity);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  let relativeLabel = 'менее минуты назад';
  if (diffMinutes === 0) {
    relativeLabel = 'менее минуты назад';
  } else if (diffMinutes < 60) {
    relativeLabel = `${diffMinutes} ${pluralizeMinutesRu(diffMinutes)} назад`;
  } else {
    relativeLabel = `${diffHours} ${pluralizeHoursRu(diffHours)} назад`;
  }

  const warning = thresholds.warningMinutes;
  const danger = thresholds.dangerMinutes;

  let color = palette.mutedInk;
  if (diffMinutes >= danger) {
    color = palette.danger;
  } else if (diffMinutes >= warning) {
    color = palette.warning;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        Последняя молитва: {relativeLabel}
      </Text>
    </View>
  );
};

export default PrayerActivityIndicator;

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 2,
    paddingHorizontal: 12,
    backgroundColor: palette.paper,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
