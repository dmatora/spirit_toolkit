import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { palette } from '@spirit/prayer-feature/theme';

import { pluralizeHoursRu, pluralizeMinutesRu } from '../../utils/plural';
import {
  DEFAULT_THRESHOLDS,
  getPrayerActivityThresholds,
  type PrayerActivityThresholds,
} from '../services/prayerActivityConfig';
import {
  getCurrentPrayerSessionStartSync,
  getLastPrayerActivitySync,
  hydratePrayerActivityFromStorage,
  subscribeToPrayerActivity,
} from '../services/prayerActivityState';

const REFRESH_INTERVAL_MS = 30000;
const INACTIVITY_TIMEOUT_MS = 10000; // consider prayer paused after 10s with no activity

type Props = {
  style?: StyleProp<ViewStyle>;
};

const PrayerActivityIndicator: React.FC<Props> = ({ style }) => {
  const [thresholds, setThresholds] = React.useState<PrayerActivityThresholds | null>(null);
  const [lastActivity, setLastActivity] = React.useState<number | null>(getLastPrayerActivitySync());
  const [sessionStart, setSessionStart] = React.useState<number | null>(
    getCurrentPrayerSessionStartSync(),
  );
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToPrayerActivity((timestamp) => {
      if (isMounted) {
        setLastActivity(timestamp);
        setSessionStart(getCurrentPrayerSessionStartSync());
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
        setSessionStart(getCurrentPrayerSessionStartSync());
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

  const formatRelativeText = (minutes: number): string => {
    if (minutes <= 0) {
      return 'менее минуты';
    }
    if (minutes < 60) {
      return `${minutes} ${pluralizeMinutesRu(minutes)}`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours} ${pluralizeHoursRu(hours)}`;
  };

  const warning = thresholds.warningMinutes;
  const danger = thresholds.dangerMinutes;
  const focusMinutes = thresholds.focusMinutes ?? DEFAULT_THRESHOLDS.focusMinutes;
  const sessionDurationMs = sessionStart != null ? Math.max(0, now - sessionStart) : 0;
  const sessionDurationMinutes = Math.floor(sessionDurationMs / 60000);
  const isCurrentPrayerActive =
    sessionStart != null &&
    lastActivity != null &&
    Math.max(0, now - lastActivity) < INACTIVITY_TIMEOUT_MS;

  let label = '';
  let color = palette.mutedInk;

  if (isCurrentPrayerActive) {
    const durationLabel = formatRelativeText(sessionDurationMinutes);
    label = `Молитва длится: ${durationLabel}`;
    color = palette.ink;

    if (sessionDurationMinutes >= focusMinutes * 2) {
      color = palette.danger;
    } else if (sessionDurationMinutes >= focusMinutes) {
      color = palette.warning;
    }
  } else {
    const relativeLabel = `${formatRelativeText(diffMinutes)} назад`;
    label = `Последняя молитва: ${relativeLabel}`;
    color = palette.ink;

    if (diffMinutes >= danger) {
      color = palette.danger;
    } else if (diffMinutes >= warning) {
      color = palette.warning;
    }
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
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
