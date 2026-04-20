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
  Switch,
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
import { updatePrayerActivityNotificationThresholds } from '../services/prayerActivityNotifications';
import {
  SYNC_SECRET_STORAGE_KEY,
  hasBuildTimeSyncToken,
  setRuntimeSyncToken,
} from '../services/syncConfig';
import { syncNow } from '../services/journalSync';
import { useFontScale } from '@spirit/prayer-feature/prayer/context/FontScaleContext';
import { useEvaluationDate } from '@spirit/prayer-feature/prayer/hooks/useEvaluationDate';
import {
  ensureLiturgicalCalendarSettingsInitialized,
  formatLiturgicalPeriodStatus,
  getLiturgicalCalendarSettings,
  getLiturgicalPeriodMeta,
  resolveLiturgicalCalendarSync,
  setLiturgicalCalendarSettings,
  type LiturgicalPeriodKey,
} from '@spirit/prayer-feature/prayer';

const PRESET_LIST: Array<{ key: keyof typeof PRESETS; label: string }> = [
  { key: 'restoring', label: 'Восстанавливающий' },
  { key: 'regular', label: 'Регулярный' },
  { key: 'diligent', label: 'Усердный' },
];

const LITURGICAL_PERIOD_OPTIONS: Array<{
  key: LiturgicalPeriodKey;
  label: string;
}> = [
  { key: 'ordinary', label: 'Обычный' },
  { key: 'bright_week', label: 'Светлая седмица' },
  { key: 'pascha_to_ascension', label: 'Пасха - Вознесение' },
  { key: 'ascension_to_trinity', label: 'Вознесение - Троица' },
];

const FONT_SCALE_MIN = 0.8;
const FONT_SCALE_MAX = 1.8;
const FONT_SCALE_STEP = 0.1;
const SLIDER_TOUCH_HEIGHT = 44;
const SLIDER_HANDLE_SIZE = 28;
const SLIDER_TRACK_THICKNESS = 6;
const DEFAULT_ACTIVITY_FOCUS_MINUTES = 3;

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
  const evaluationDate = useEvaluationDate();
  const [normalValue, setNormalValue] = React.useState('0');
  const [warningValue, setWarningValue] = React.useState('0');
  const [activityWarningMinutesValue, setActivityWarningMinutesValue] =
    React.useState('30');
  const [activityDangerMinutesValue, setActivityDangerMinutesValue] =
    React.useState('60');
  const [activityFocusMinutesValue, setActivityFocusMinutesValue] = React.useState(
    String(DEFAULT_ACTIVITY_FOCUS_MINUTES),
  );
  const [selectedPreset, setSelectedPreset] = React.useState<keyof typeof PRESETS | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [syncSecret, setSyncSecret] = React.useState('');
  const [hasEmbeddedToken] = React.useState(() => hasBuildTimeSyncToken());
  const [sliderValue, setSliderValue] = React.useState(() => quantizeFontScale(fontScale));
  const [trackWidth, setTrackWidth] = React.useState(0);
  const [liturgicalAutoDetect, setLiturgicalAutoDetect] = React.useState(true);
  const [liturgicalManualPeriod, setLiturgicalManualPeriod] =
    React.useState<LiturgicalPeriodKey>('ordinary');

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
      const focusMinutes =
        typeof thresholds.focusMinutes === 'number'
          ? thresholds.focusMinutes
          : DEFAULT_ACTIVITY_FOCUS_MINUTES;
      setActivityFocusMinutesValue(String(focusMinutes));
      setActivityWarningMinutesValue(String(thresholds.warningMinutes));
      setActivityDangerMinutesValue(String(thresholds.dangerMinutes));
    },
    [],
  );

  const liturgicalPreview = React.useMemo(
    () =>
      resolveLiturgicalCalendarSync(
        {
          autoDetect: liturgicalAutoDetect,
          manualPeriod: liturgicalManualPeriod,
        },
        evaluationDate,
      ),
    [evaluationDate, liturgicalAutoDetect, liturgicalManualPeriod],
  );

  const liturgicalPeriodStatus = liturgicalAutoDetect
    ? formatLiturgicalPeriodStatus(liturgicalPreview.period)
    : `Ручной режим: ${liturgicalPreview.period.title}`;

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        await Promise.all([
          ensureSettingsInitialized(),
          ensurePrayerActivityConfigInitialized(),
          ensureLiturgicalCalendarSettingsInitialized(),
        ]);
        const [thresholds, activityThresholds, liturgicalSettings] = await Promise.all([
          getLiturgyThresholds(),
          getPrayerActivityThresholds(),
          getLiturgicalCalendarSettings(),
        ]);
        if (!active) {
          return;
        }
        updateThresholdState(thresholds);
        updateActivityThresholdState(activityThresholds);
        setLiturgicalAutoDetect(liturgicalSettings.autoDetect);
        setLiturgicalManualPeriod(liturgicalSettings.manualPeriod);
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
        focusMinutes: safeParseNumber(activityFocusMinutesValue),
        warningMinutes: safeParseNumber(activityWarningMinutesValue),
        dangerMinutes: safeParseNumber(activityDangerMinutesValue),
      });
      updateActivityThresholdState(activityThresholds);
      try {
        await updatePrayerActivityNotificationThresholds(activityThresholds);
      } catch (error) {
        console.warn(
          '[SettingsScreen] Failed to update prayer activity notifications thresholds',
          error,
        );
      }
    } catch (error) {
      console.warn('[SettingsScreen]', error);
    }

    try {
      const liturgicalSettings = await setLiturgicalCalendarSettings({
        autoDetect: liturgicalAutoDetect,
        manualPeriod: liturgicalManualPeriod,
      });
      setLiturgicalAutoDetect(liturgicalSettings.autoDetect);
      setLiturgicalManualPeriod(liturgicalSettings.manualPeriod);
    } catch (error) {
      console.warn('[SettingsScreen] Failed to persist liturgical calendar', error);
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
    activityFocusMinutesValue,
    activityWarningMinutesValue,
    liturgicalAutoDetect,
    liturgicalManualPeriod,
    normalValue,
    sliderValue,
    syncSecret,
    setFontScale,
    updateActivityThresholdState,
    updateThresholdState,
    warningValue,
    updatePrayerActivityNotificationThresholds,
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
          <Text style={styles.header}>Настройки приложения</Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Литургический календарь</Text>
            <View style={styles.liturgicalStatusBox}>
              <Text style={styles.liturgicalStatusTitle}>
                {liturgicalPreview.period.title}
              </Text>
              <Text style={styles.caption}>{liturgicalPeriodStatus}</Text>
              <Text style={styles.caption}>
                {liturgicalPreview.period.description}
              </Text>
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchTextColumn}>
                <Text style={styles.inputLabel}>Автоопределение режима</Text>
                <Text style={styles.caption}>
                  Приложение выбирает период по дате православной Пасхи.
                </Text>
              </View>
              <Switch
                accessibilityLabel="Автоопределение литургического режима"
                value={liturgicalAutoDetect}
                onValueChange={setLiturgicalAutoDetect}
                trackColor={{
                  false: palette.divider,
                  true: palette.accentSoft,
                }}
                thumbColor={liturgicalAutoDetect ? palette.accent : palette.card}
              />
            </View>
            {!liturgicalAutoDetect && (
              <View style={styles.manualPeriodGroup}>
                <Text style={styles.subsectionLabel}>Ручной режим</Text>
                <View style={styles.periodGrid}>
                  {LITURGICAL_PERIOD_OPTIONS.map((option) => {
                    const isSelected = liturgicalManualPeriod === option.key;
                    const meta = getLiturgicalPeriodMeta(option.key);
                    return (
                      <Pressable
                        key={option.key}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => setLiturgicalManualPeriod(option.key)}
                        style={[
                          styles.periodOption,
                          isSelected && styles.periodOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.periodOptionText,
                            isSelected && styles.periodOptionTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.periodOptionDescription,
                            isSelected && styles.periodOptionDescriptionSelected,
                          ]}
                        >
                          {meta.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

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
              Индикатор показывает длительность текущей молитвы и время перерыва между молитвами.
              Настройте оба сценария, чтобы понимать, когда стоит сосредоточиться или сделать
              паузу.
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
            <Text style={styles.caption}>
              Цвета применяются и к текущей активной молитве, и к таймеру после последней молитвы.
            </Text>
            <Text style={styles.subsectionLabel}>Текущая молитва</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Окно внимания (минут)</Text>
              <TextInput
                accessibilityLabel="Окно внимания (минут)"
                keyboardType="number-pad"
                value={activityFocusMinutesValue}
                onChangeText={(txt) =>
                  setActivityFocusMinutesValue(txt.replace(/[^\d]/g, ''))
                }
                style={styles.input}
              />
            </View>
            <Text style={styles.caption}>
              После указанного времени непрерывной молитвы индикатор станет жёлтым, а после
              удвоенного значения - красным.
            </Text>
            <Text style={styles.subsectionLabel}>Перерыв между молитвами</Text>
            <Text style={styles.caption}>
              Эти значения учитывают время без прокрутки текста и показывают, когда пора вернуться к
              молитве.
            </Text>
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
  liturgicalStatusBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    backgroundColor: palette.card,
    marginBottom: 12,
  },
  liturgicalStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchTextColumn: {
    flex: 1,
  },
  manualPeriodGroup: {
    marginTop: 8,
  },
  periodGrid: {
    gap: 10,
  },
  periodOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    backgroundColor: palette.card,
  },
  periodOptionSelected: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  periodOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 4,
  },
  periodOptionTextSelected: {
    color: palette.paper,
  },
  periodOptionDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: palette.mutedInk,
  },
  periodOptionDescriptionSelected: {
    color: palette.paper,
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
  subsectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.mutedInk,
    marginTop: 12,
    marginBottom: 8,
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
