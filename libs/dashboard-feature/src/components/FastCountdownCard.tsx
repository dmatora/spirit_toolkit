import { useMemo } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { getNextMajorFast } from '@spirit/prayer-feature/utils/fasts';
import { pluralizeDaysRu } from '@spirit/prayer-feature/utils/plural';
import { palette } from '@spirit/prayer-feature/theme';
import { useMidnightTicker } from './useMidnightTicker';

type Props = {
  referenceDate?: Date;
  style?: StyleProp<ViewStyle>;
};

const shadowStyle = Platform.select<ViewStyle>({
  android: {
    elevation: 6,
  },
  default: {
    shadowColor: palette.ink,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
});

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: palette.card,
    ...(shadowStyle ?? {}),
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: palette.mutedInk,
    marginBottom: 8,
  },
  fastName: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.ink,
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
    color: palette.mutedInk,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: palette.chipBg,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.accent,
  },
});

const FastCountdownCard = ({ referenceDate, style }: Props) => {
  const baseDate = useMidnightTicker(referenceDate);

  const data = useMemo(() => {
    try {
      const nextFast = getNextMajorFast(baseDate);
      if (!nextFast?.fast || !(nextFast.fast.startDate instanceof Date)) {
        return undefined;
      }
      return nextFast;
    } catch (error) {
      return undefined;
    }
  }, [baseDate]);

  if (!data) {
    return null;
  }

  const { fast, daysLeft } = data;
  const localizedDate = useMemo(
    () =>
      fast.startDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [fast.startDate],
  );
  const chipText = daysLeft === 0 ? 'сегодня' : `${daysLeft} ${pluralizeDaysRu(daysLeft)}`;

  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() => {
        console.log('FastCountdownCard pressed');
      }}
    >
      <Text style={styles.label}>Ближайший пост</Text>
      <Text style={styles.fastName}>{fast.titleRu}</Text>
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={16} color={palette.mutedInk} />
        <Text style={styles.dateText}>{localizedDate}</Text>
      </View>
      <View style={styles.chip}>
        <Ionicons name="time-outline" size={16} color={palette.accent} />
        <Text style={styles.chipText}>{chipText}</Text>
      </View>
    </Pressable>
  );
};

export default FastCountdownCard;
