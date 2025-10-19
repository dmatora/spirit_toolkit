import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { palette } from '@spirit/prayer-feature/theme';

type Props = {
  startTime: Date | null;
  minutesSinceStart: number | null;
  onChange: (next: Date) => void;
  style?: StyleProp<ViewStyle>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: palette.mutedInk,
    marginBottom: 4,
  },
  time: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.ink,
  },
  meta: {
    fontSize: 12,
    color: palette.mutedInk,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.chipBg,
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.mutedInk,
  },
});

const formatTime = (value: Date | null) => {
  if (!value) return '--:--';
  try {
    return value.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

const ServiceClockBar = ({ startTime, minutesSinceStart, onChange, style }: Props) => {
  const adjustTime = useCallback(
    (deltaMinutes: number) => {
      const base = startTime ?? new Date();
      const next = new Date(base.getTime() + deltaMinutes * 60_000);
      onChange(next);
    },
    [onChange, startTime],
  );

  const setToNow = useCallback(() => {
    onChange(new Date());
  }, [onChange]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.info}>
        <Text style={styles.label}>Начало службы</Text>
        <Text style={styles.time}>{formatTime(startTime)}</Text>
        <Text style={styles.meta}>
          {minutesSinceStart != null ? `Прошло: ${minutesSinceStart} мин` : 'Прошло: —'}
        </Text>
      </View>
      <View style={styles.controls}>
        <Pressable
          style={styles.button}
          onPress={() => adjustTime(-5)}
          accessibilityRole="button"
          accessibilityLabel="Сдвинуть начало службы на минус пять минут"
        >
          <Text style={styles.buttonText}>-5 мин</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={setToNow}
          accessibilityRole="button"
          accessibilityLabel="Установить начало службы на текущее время"
        >
          <Text style={styles.buttonText}>Сейчас</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => adjustTime(5)}
          accessibilityRole="button"
          accessibilityLabel="Сдвинуть начало службы на плюс пять минут"
        >
          <Text style={styles.buttonText}>+5 мин</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default ServiceClockBar;
