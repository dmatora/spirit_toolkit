import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import {
  ensurePrayerActivityConfigInitialized,
  getPrayerActivityThresholds,
  setPrayerActivityThresholds,
  type PrayerActivityThresholds,
} from '../services/prayerActivityConfig';
import {
  SYNC_SECRET_STORAGE_KEY,
  hasBuildTimeSyncToken,
  setRuntimeSyncToken,
} from '../services/syncConfig';
import { syncNow } from '../services/journalSync';
import { useFontScale } from '@spirit/prayer-feature/prayer/context/FontScaleContext';

const PRESET_LIST: Array<{ key: keyof typeof PRESETS; label: string }> = [
  { key: 'restoring', label: 'Восстанавливающий' },
  { key: 'regular', label: 'Регулярный' },
  { key: 'diligent', label: 'Усердный' },
];

const FONT_SCALE_MIN = 0.8;
const FONT_SCALE_MAX = 1.8;
const FONT_SCALE_STEP = 0.1;
const SLIDER_TOUCH_HEIGHT = 44;
const SLIDER_HANDLE_SIZE = 28;
const SLIDER_TRACK_THICKNESS = 6;

const clampFontScale = (value: number) =>
  Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, value));

const quantizeFontScale = (value: number) => {
  const clamped = clampFontScale(value);
  const steps = Math.round((clamped - FONT_SCALE_MIN) / FONT_SCALE_STEP);
  return Number((FONT_SCALE_MIN + steps * FONT_SCALE_STEP).toFixed(1));
};

const describeFontScale = (value: number) => {
  if (value <= 0.95) {
    return 'Малый';
  }
  if (value >= 1.35) {
    return 'Крупный';
  }
  return 'Обычный';
};

const safeParseNumber = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const SettingsScreen = () => {
  const { fontScale, setFontScale } = useFontScale();
  const [normalValue, setNormalValue] = React.useState('0');
  const [warningValue, setWarningValue] = React.useState('0');
  const [activityWarningMinutesValue, setActivityWarningMinutesValue] =
    React.useState('30');
  const [activityDangerMinutesValue, setActivityDangerMinutesValue] =
    React.useState('60');
  const [selectedPreset, setSelectedPreset] = React.useState<keyof typeof PRESETS | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [syncSecret, setSyncSecret] = React.useState('');
  const [hasEmbeddedToken] = React.useState(() => hasBuildTimeSyncToken());
  const [sliderValue, setSliderValue] = React.useState(() => quantizeFontScale(fontScale));
  const [trackWidth, setTrackWidth] = React.useState(0);

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

  const updateActivityThresholdState = React.useCallback(
    (thresholds: PrayerActivityThresholds) => {
      setActivityWarningMinutesValue(String(thresholds.warningMinutes));
      setActivityDangerMinutesValue(String(thresholds.dangerMinutes));
    },
    [],
  );

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        await Promise.all([
          ensureSettingsInitialized(),
          ensurePrayerActivityConfigInitialized(),
        ]);
        const [thresholds, activityThresholds] = await Promise.all([
          getLiturgyThresholds(),
          getPrayerActivityThresholds(),
        ]);
        if (!active) {
          return;
        }
        updateThresholdState(thresholds);
        updateActivityThresholdState(activityThresholds);
      } catch (error) {
        console.warn('[SettingsScreen]', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [updateActivityThresholdState, updateThresholdState]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SYNC_SECRET_STORAGE_KEY);
        if (!active) {
          return;
        }
        const value = stored ?? '';
        setSyncSecret(value);
        const trimmed = value.trim();
        setRuntimeSyncToken(trimmed.length > 0 ? trimmed : undefined);
      } catch (error) {
        console.warn('[SettingsScreen] Failed to load sync secret', error);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  React.useEffect(() => {
    setSliderValue(quantizeFontScale(fontScale));
  }, [fontScale]);

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

  const handleTrackLayout = React.useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const sliderRatio =
    (sliderValue - FONT_SCALE_MIN) / (FONT_SCALE_MAX - FONT_SCALE_MIN);
  const clampedSliderRatio = Number.isFinite(sliderRatio)
    ? Math.min(Math.max(sliderRatio, 0), 1)
    : 0;

  const adjustSliderValue = React.useCallback((delta: number) => {
    setSliderValue((current) => quantizeFontScale(current + delta));
  }, []);

  const updateSliderFromOffset = React.useCallback(
    (locationX: number) => {
      if (trackWidth <= 0) {
        return;
      }
      const boundedX = Math.min(Math.max(locationX, 0), trackWidth);
      const ratio = boundedX / trackWidth;
      const nextValue = FONT_SCALE_MIN + ratio * (FONT_SCALE_MAX - FONT_SCALE_MIN);
      setSliderValue(quantizeFontScale(nextValue));
    },
    [trackWidth],
  );

  const sliderPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateSliderFromOffset(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateSliderFromOffset(event.nativeEvent.locationX),
        onPanResponderRelease: (event) => updateSliderFromOffset(event.nativeEvent.locationX),
        onPanResponderTerminationRequest: () => false,
      }),
    [updateSliderFromOffset],
  );

  const sliderPreviewStyle = React.useMemo(
    () => ({
      fontSize: 16 * sliderValue,
      lineHeight: 22 * sliderValue,
    }),
    [sliderValue],
  );

  const handleSave = React.useCallback(async () => {
    try {
      const config = await setLiturgyThresholds({
        normal: safeParseNumber(normalValue),
        warning: safeParseNumber(warningValue),
      });
      updateThresholdState(config.metrics.liturgy.thresholds);
    } catch (error) {
      console.warn('[SettingsScreen]', error);
      return;
    }

    try {
      const activityThresholds = await setPrayerActivityThresholds({
        warningMinutes: safeParseNumber(activityWarningMinutesValue),
        dangerMinutes: safeParseNumber(activityDangerMinutesValue),
      });
      updateActivityThresholdState(activityThresholds);
    } catch (error) {
      console.warn('[SettingsScreen]', error);
    }

    const trimmedSecret = syncSecret.trim();
    if (trimmedSecret.length > 0) {
      try {
        await AsyncStorage.setItem(SYNC_SECRET_STORAGE_KEY, trimmedSecret);
      } catch (error) {
        console.warn('[SettingsScreen] Failed to persist sync secret', error);
      }
      setRuntimeSyncToken(trimmedSecret);
      try {
        await syncNow();
      } catch (error) {
        console.warn('[SettingsScreen] Failed to trigger sync after saving token', error);
      }
    } else {
      try {
        await AsyncStorage.removeItem(SYNC_SECRET_STORAGE_KEY);
      } catch (error) {
        console.warn('[SettingsScreen] Failed to remove sync secret', error);
      }
      setRuntimeSyncToken(undefined);
    }

    setFontScale(sliderValue);
    setSaved(true);
  }, [
    activityDangerMinutesValue,
    activityWarningMinutesValue,
    normalValue,
    sliderValue,
    syncSecret,
    setFontScale,
    updateActivityThresholdState,
    updateThresholdState,
    warningValue,
  ]);

  const warningNumber = safeParseNumber(warningValue);
  const sliderDescriptor = describeFontScale(sliderValue);
  const sliderValueLabel = sliderValue.toFixed(1);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
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
            <View
              style={styles.legendRow}
              accessibilityLabel="Легенда: Норма"
            >
              <View style={[styles.legendDot, { backgroundColor: palette.ink }]} />
              <Text style={styles.legendText}>Норма</Text>
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Норма (дней)</Text>
              <TextInput
                accessibilityLabel="Норма (дней)"
                keyboardType="number-pad"
                value={normalValue}
                onChangeText={(txt) => setNormalValue(txt.replace(/[^\d]/g, ''))}
                style={styles.input}
              />
            </View>
            <Text style={styles.caption}>Пока не прошло столько дней, состояние считается нормальным</Text>

            <View
              style={styles.legendRow}
              accessibilityLabel="Легенда: Предупреждение"
            >
              <View style={[styles.legendDot, { backgroundColor: palette.warning }]} />
              <Text style={styles.legendText}>Предупреждение</Text>
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Предупреждение (дней)</Text>
              <TextInput
                accessibilityLabel="Предупреждение (дней)"
                keyboardType="number-pad"
                value={warningValue}
                onChangeText={(txt) => setWarningValue(txt.replace(/[^\d]/g, ''))}
                style={styles.input}
              />
            </View>
            <Text style={styles.caption}>Состояние длится до этого количества дней</Text>

            <View
              style={styles.legendRow}
              accessibilityLabel="Легенда: Тревога"
            >
              <View style={[styles.legendDot, { backgroundColor: palette.danger }]} />
              <Text style={styles.legendText}>Тревога</Text>
            </View>
            <Text style={styles.caption}>
              Наступает, если прошло больше дней, чем указано в «Предупреждении»
            </Text>
            <Text style={[styles.caption, { color: palette.danger, fontWeight: '600' }]}>
              Тревога: &gt; {warningNumber} дней
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Индикатор молитвы</Text>
            <Text style={styles.caption}>
              Укажите, когда подсказка на молитве становится жёлтой и когда меняет цвет на красный.
            </Text>
            <View
              style={styles.legendRow}
              accessibilityLabel="Легенда: Норма"
            >
              <View style={[styles.legendDot, { backgroundColor: palette.ink }]} />
              <Text style={styles.legendText}>Норма</Text>
            </View>
            <View
              style={styles.legendRow}
              accessibilityLabel="Легенда: Предупреждение"
            >
              <View style={[styles.legendDot, { backgroundColor: palette.warning }]} />
              <Text style={styles.legendText}>Предупреждение</Text>
            </View>
            <View
              style={styles.legendRow}
              accessibilityLabel="Легенда: Тревога"
            >
              <View style={[styles.legendDot, { backgroundColor: palette.danger }]} />
              <Text style={styles.legendText}>Тревога</Text>
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Предупреждение (минут)</Text>
              <TextInput
                accessibilityLabel="Предупреждение (минут)"
                keyboardType="number-pad"
                value={activityWarningMinutesValue}
                onChangeText={(txt) =>
                  setActivityWarningMinutesValue(txt.replace(/[^\d]/g, ''))
                }
                style={styles.input}
              />
            </View>
            <Text style={styles.caption}>
              После этого времени без прокрутки текст станет жёлтым.
            </Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Тревога (минут)</Text>
              <TextInput
                accessibilityLabel="Тревога (минут)"
                keyboardType="number-pad"
                value={activityDangerMinutesValue}
                onChangeText={(txt) =>
                  setActivityDangerMinutesValue(txt.replace(/[^\d]/g, ''))
                }
                style={styles.input}
              />
            </View>
            <Text style={styles.caption}>
              После этого времени без прокрутки текст станет красным.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Размер шрифта</Text>
            <Text style={styles.caption}>
              Настройте масштаб текста молитв для удобного чтения и слабовидящих пользователей.
            </Text>
            <View
              style={styles.sliderTrack}
              onLayout={handleTrackLayout}
              accessibilityRole="adjustable"
              accessibilityLabel="Размер шрифта"
              accessibilityValue={{ text: `${sliderValueLabel}x` }}
              accessibilityActions={[
                { name: 'increment', label: 'Увеличить масштаб' },
                { name: 'decrement', label: 'Уменьшить масштаб' },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'increment') {
                  adjustSliderValue(FONT_SCALE_STEP);
                  return;
                }
                if (event.nativeEvent.actionName === 'decrement') {
                  adjustSliderValue(-FONT_SCALE_STEP);
                }
              }}
              {...sliderPanResponder.panHandlers}
            >
              <View style={styles.sliderRail} />
              <View
                style={[
                  styles.sliderFill,
                  { width: trackWidth > 0 ? clampedSliderRatio * trackWidth : 0 },
                ]}
              />
              <View
                style={[
                  styles.sliderHandle,
                  {
                    left: -SLIDER_HANDLE_SIZE / 2,
                    transform: [
                      {
                        translateX: trackWidth > 0 ? clampedSliderRatio * trackWidth : 0,
                      },
                    ],
                  },
                ]}
              />
            </View>
            <View style={styles.sliderLabelsRow}>
              <Text style={styles.sliderValueText}>{sliderValueLabel}x</Text>
              <Text style={styles.sliderDescriptor}>{sliderDescriptor}</Text>
            </View>
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Пример</Text>
              <Text style={[styles.previewText, sliderPreviewStyle]}>
                Пример текста молитвы
              </Text>
            </View>
          </View>

          {!hasEmbeddedToken && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Синхронизация</Text>
              <TextInput
                accessibilityLabel="Секрет синхронизации"
                autoCapitalize="none"
                autoCorrect={false}
                value={syncSecret}
                onChangeText={setSyncSecret}
                placeholder="Введите секрет"
                style={styles.secretInput}
              />
              <Text style={styles.caption}>
                Используйте секрет, чтобы синхронизировать журнал между устройствами.
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Сохранить настройки"
            style={styles.saveButton}
            onPress={() => {
              Keyboard.dismiss();
              handleSave();
            }}
          >
            <Text style={styles.saveButtonText}>Сохранить</Text>
          </Pressable>
          {saved && <Text style={styles.savedText}>Сохранено</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch',
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
  secretInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: palette.ink,
    backgroundColor: palette.card,
    fontSize: 14,
    marginBottom: 8,
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
  caption: {
    fontSize: 13,
    color: palette.mutedInk,
    marginBottom: 12,
  },
  sliderTrack: {
    position: 'relative',
    height: SLIDER_TOUCH_HEIGHT,
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sliderRail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SLIDER_TRACK_THICKNESS,
    borderRadius: SLIDER_TRACK_THICKNESS / 2,
    backgroundColor: palette.divider,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: SLIDER_TRACK_THICKNESS,
    borderRadius: SLIDER_TRACK_THICKNESS / 2,
    backgroundColor: palette.accent,
  },
  sliderHandle: {
    position: 'absolute',
    top: (SLIDER_TOUCH_HEIGHT - SLIDER_HANDLE_SIZE) / 2,
    width: SLIDER_HANDLE_SIZE,
    height: SLIDER_HANDLE_SIZE,
    borderRadius: SLIDER_HANDLE_SIZE / 2,
    backgroundColor: palette.ink,
    borderWidth: 2,
    borderColor: palette.paper,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderValueText: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.ink,
  },
  sliderDescriptor: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.mutedInk,
    textTransform: 'uppercase',
  },
  previewBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: palette.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
  },
  previewLabel: {
    fontSize: 12,
    color: palette.mutedInk,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewText: {
    color: palette.ink,
  },
});

export default SettingsScreen;
