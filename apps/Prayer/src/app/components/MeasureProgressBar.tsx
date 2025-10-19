import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { palette } from '@spirit/prayer-feature/theme';

type MeasureProgressBarProps = {
  progress: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    height: 6,
    borderRadius: 4,
    backgroundColor: palette.divider,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: palette.accent,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: palette.mutedInk,
  },
});

const MeasureProgressBar: React.FC<MeasureProgressBarProps> = ({ progress, label, style }) => {
  const normalized = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const accessibilityLabel = label || 'Прогресс расчёта';

  return (
    <View style={[styles.container, style]}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{
          now: Math.round(normalized * 100),
          min: 0,
          max: 100,
        }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${normalized * 100}%` }]} />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
};

export default MeasureProgressBar;
