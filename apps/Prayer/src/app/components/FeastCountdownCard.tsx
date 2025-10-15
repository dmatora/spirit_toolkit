import { useMemo, useRef } from 'react';
import { Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { getNextMajorFeast } from '../utils/feasts';
import { pluralizeDaysRu } from '../utils/plural';

type Props = {
  referenceDate?: Date;
  style?: StyleProp<ViewStyle>;
};

const shadowStyle = Platform.select<ViewStyle>({
  android: {
    elevation: 4,
  },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...(shadowStyle ?? {}),
  },
  title: {
    fontSize: 16,
    color: '#1f2933',
    marginBottom: 4,
  },
  feastName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 12,
  },
  countdown: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
  },
});

const FeastCountdownCard = ({ referenceDate, style }: Props) => {
  const fallbackDateRef = useRef<Date>();

  if (!fallbackDateRef.current) {
    fallbackDateRef.current = new Date();
  }

  const data = useMemo(() => {
    try {
      const baseDate = referenceDate ?? fallbackDateRef.current!;
      return getNextMajorFeast(baseDate);
    } catch (error) {
      return undefined;
    }
  }, [referenceDate]);

  if (!data) {
    return null;
  }

  const { feast, daysLeft } = data;

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>До праздника</Text>
      <Text style={styles.feastName}>{feast.titleRu}</Text>
      <Text style={styles.countdown}>
        Осталось: {daysLeft} {pluralizeDaysRu(daysLeft)}
      </Text>
    </View>
  );
};

export default FeastCountdownCard;
