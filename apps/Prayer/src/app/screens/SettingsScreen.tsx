import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@spirit/prayer-feature/theme';
import {
  PRESETS,
  applyPresetTo,
  ensureSettingsInitialized,
  getLiturgyThresholds,
  setLiturgyThresholds,
  type Thresholds,
} from '../services/attendanceConfig';

const PRESET_LIST: Array<{ key: keyof typeof PRESETS; label: string }> = [
  { key: 'restoring', label: 'Восстанавливающий' },
  { key: 'regular', label: 'Регулярный' },
  { key: 'diligent', label: 'Усердный' },
];

const safeParseNumber = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const SettingsScreen = () => {
  const [normalValue, setNormalValue] = React.useState('0');
  const [warningValue, setWarningValue] = React.useState('0');
  const [selectedPreset, setSelectedPreset] = React.useState<keyof typeof PRESETS | null>(null);
  const [saved, setSaved] = React.useState(false);

  const matchPreset = React.useCallback((thresholds: Thresholds) => {
    for (const entry of PRESET_LIST) {
      const preset = PRESETS[entry.key];
      if (preset.normal === thresholds.normal && preset.warning === thresholds.warning) {
        return entry.key;
      }
    }
    return null;
  }, []);

  const updateThresholdState = React.useCallback(
    (thresholds: Thresholds) => {
      setNormalValue(String(thresholds.normal));
      setWarningValue(String(thresholds.warning));
      setSelectedPreset(matchPreset(thresholds));
    },
    [matchPreset],
  );

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensureSettingsInitialized();
        const thresholds = await getLiturgyThresholds();
        if (active) {
          updateThresholdState(thresholds);
        }
      } catch (error) {
        console.warn('[SettingsScreen]', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [updateThresholdState]);

  React.useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  const handlePresetSelect = React.useCallback(
    async (preset: keyof typeof PRESETS) => {
      try {
        const config = await applyPresetTo('liturgy', preset);
        updateThresholdState(config.metrics.liturgy.thresholds);
      } catch (error) {
        console.warn('[SettingsScreen]', error);
      }
    },
    [updateThresholdState],
  );

  const handleSave = React.useCallback(async () => {
    try {
      const config = await setLiturgyThresholds({
        normal: safeParseNumber(normalValue),
        warning: safeParseNumber(warningValue),
      });
      updateThresholdState(config.metrics.liturgy.thresholds);
      setSaved(true);
    } catch (error) {
      console.warn('[SettingsScreen]', error);
    }
  }, [normalValue, warningValue, updateThresholdState]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Настройка ритма посещений</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Выберите пресет</Text>
        <View style={styles.presetRow}>
          {PRESET_LIST.map((preset) => {
            const isSelected = selectedPreset === preset.key;
            return (
              <Pressable
                key={preset.key}
                accessibilityRole="button"
                onPress={() => handlePresetSelect(preset.key)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Тонкая настройка</Text>

        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: palette.ink }]} />
          <Text style={styles.legendText}>Норма</Text>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Норма (дней)</Text>
          <TextInput
            accessibilityLabel="Норма (дней)"
            keyboardType="number-pad"
            value={normalValue}
            onChangeText={setNormalValue}
            style={styles.input}
          />
        </View>

        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: palette.mutedInk }]} />
          <Text style={styles.legendText}>Предупреждение</Text>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Предупреждение (дней)</Text>
          <TextInput
            accessibilityLabel="Предупреждение (дней)"
            keyboardType="number-pad"
            value={warningValue}
            onChangeText={setWarningValue}
            style={styles.input}
          />
        </View>

        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: palette.accent }]} />
          <Text style={styles.legendText}>Тревога</Text>
        </View>
      </View>

      <Pressable accessibilityRole="button" style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Сохранить</Text>
      </Pressable>
      {saved && <Text style={styles.savedText}>Сохранено</Text>}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: palette.paper,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.mutedInk,
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    backgroundColor: palette.card,
  },
  chipSelected: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  chipText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: palette.paper,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: palette.mutedInk,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: palette.ink,
    flex: 1,
    marginRight: 16,
  },
  input: {
    width: 80,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    paddingVertical: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    color: palette.ink,
    backgroundColor: palette.card,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: palette.ink,
  },
  saveButtonText: {
    color: palette.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  savedText: {
    marginTop: 12,
    textAlign: 'center',
    color: palette.mutedInk,
    fontSize: 14,
  },
});

export default SettingsScreen;
