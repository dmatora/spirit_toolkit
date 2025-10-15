import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { getNextMajorFeast } from '../utils/feasts';
import { pluralizeDaysRu } from '../utils/plural';

type Props = {
  referenceDate?: Date;
  style?: StyleProp<ViewStyle>;
};

const shadowStyle = Platform.select<ViewStyle>({
  android: {
    elevation: 6,
  },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
});

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#fff',
    ...(shadowStyle ?? {}),
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#6B7280',
    marginBottom: 8,
  },
  feastName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#6B7280',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3730A3',
  },
});

const FeastCountdownCard = ({ referenceDate, style }: Props) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (referenceDate) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextMidnight = () => {
      const current = new Date();
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      const timeoutMs = Math.max(0, nextMidnight.getTime() - current.getTime());
      timeout = setTimeout(() => {
        setNow(new Date());
        scheduleNextMidnight();
      }, timeoutMs);
    };

    scheduleNextMidnight();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [referenceDate]);

  const data = useMemo(() => {
    try {
      const baseDate = referenceDate ?? now;
      return getNextMajorFeast(baseDate);
    } catch (error) {
      return undefined;
    }
  }, [referenceDate, now]);

  if (!data) {
    return null;
  }

  const { feast, daysLeft } = data;
  const localizedDate = useMemo(
    () =>
      feast.date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [feast.date],
  );
  const chipText = daysLeft === 0 ? 'сегодня' : `${daysLeft} ${pluralizeDaysRu(daysLeft)}`;

  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() => {
        console.log('FeastCountdownCard pressed');
      }}
    >
      <Text style={styles.label}>Ближайший праздник</Text>
      <Text style={styles.feastName}>{feast.titleRu}</Text>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={16} color="#6B7280" />
        <Text style={styles.dateText}>{localizedDate}</Text>
      </View>
      <View style={styles.chip}>
        <Ionicons name="time-outline" size={16} color="#4F46E5" />
        <Text style={styles.chipText}>{chipText}</Text>
      </View>
    </Pressable>
  );
};

export default FeastCountdownCard;
