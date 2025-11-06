import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { CSSProperties } from 'react';
import { palette } from '@spirit/prayer-feature/theme';
import type { PrayerId } from '@spirit/prayer-feature';
import { addJournalEntry } from '../services/journalDb';
import { triggerSync } from '../services/journalSync.web';
import { PRAYER_OPTIONS } from '../constants/prayers';

type Props = { visible: boolean; onClose: () => void; onSaved?: () => void };

const overlayBase = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
  justifyContent: 'center',
  alignItems: 'center',
};

const backdropBase = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.35)',
};

const styles = StyleSheet.create({
  overlay: overlayBase as unknown as ViewStyle,
  backdrop: backdropBase as unknown as ViewStyle,
  card: {
    width: '88%',
    maxWidth: 520,
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    borderColor: palette.divider,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: { fontSize: 18, fontWeight: '700', color: palette.ink, marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.mutedInk,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 8,
  },
  prayerList: { marginTop: 4 },
  prayerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.paper,
    marginTop: 8,
  },
  prayerOptionActive: { borderColor: palette.accent, backgroundColor: '#EEF5FF' },
  prayerOptionText: { color: palette.ink, fontWeight: '600', flexShrink: 1 },
  prayerOptionTextActive: { color: palette.accent },
  prayerOptionTick: { marginLeft: 12, color: palette.accent, fontWeight: '700', fontSize: 16 },
  datetimeSection: { marginTop: 4 },
  timeRow: { flexDirection: 'row', marginTop: 12 },
  timeCol: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: palette.chipBg },
  btnPrimary: { backgroundColor: palette.accent },
  btnText: { color: palette.ink, fontWeight: '600' },
  btnTextPrimary: { color: palette.paper, fontWeight: '700' },
});

const datetimeInputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: `1px solid ${palette.divider}`,
  backgroundColor: palette.paper,
  color: palette.ink,
  fontSize: 16,
  marginTop: 8,
  outline: 'none',
};

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: `1px solid ${palette.divider}`,
  backgroundColor: palette.paper,
  color: palette.ink,
  fontSize: 16,
  appearance: 'none',
};

const formatDateValue = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatTimeValue = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const AddJournalEntryModalWeb: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const [prayerId, setPrayerId] = useState<PrayerId>('liturgy');
  const [dateValue, setDateValue] = useState<string>(() => formatDateValue(new Date()));
  const [timeValue, setTimeValue] = useState<string>(() => formatTimeValue(new Date()));

  useEffect(() => {
    if (visible) {
      const now = new Date();
      setDateValue(formatDateValue(now));
      setTimeValue(formatTimeValue(now));
    }
  }, [visible]);

  const prayerOptions = useMemo(() => PRAYER_OPTIONS, []);
  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, index) => index.toString().padStart(2, '0')),
    [],
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, index) => index.toString().padStart(2, '0')),
    [],
  );
  const [hourPart = '00', minutePart = '00'] = timeValue.split(':');

  const save = async () => {
    let timestampMs = Date.now();
    if (dateValue && timeValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      const [hours, minutes] = timeValue.split(':').map(Number);
      if ([year, month, day, hours, minutes].every((value) => Number.isFinite(value))) {
        timestampMs = new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0).getTime();
      }
    }
    try {
      await addJournalEntry(prayerId, Math.floor(timestampMs / 1000));
      onSaved?.();
      triggerSync();
      onClose();
    } catch (error) {
      console.warn('[AddJournalEntryModal:web] failed to save entry', error);
      if (typeof window !== 'undefined') {
        window.alert('Не удалось сохранить запись. Попробуйте ещё раз.');
      }
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay} accessibilityLabel="Форма добавления записи">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Закрыть модальное окно добавления записи"
      />
      <View style={styles.card}>
        <Text style={styles.title}>Новая запись</Text>
        <Text style={styles.sectionTitle}>Молитва</Text>
        <View style={styles.prayerList}>
          {prayerOptions.map((opt) => {
            const active = prayerId === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setPrayerId(opt.id)}
                style={({ pressed }) => [
                  styles.prayerOption,
                  active && styles.prayerOptionActive,
                  pressed && { opacity: 0.9 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Выбрать: ${opt.title}`}
              >
                <Text style={[styles.prayerOptionText, active && styles.prayerOptionTextActive]} numberOfLines={1}>
                  {opt.title}
                </Text>
                {active && (
                  <Text style={styles.prayerOptionTick} accessibilityElementsHidden>
                    ✓
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Дата и время</Text>
        <View style={styles.datetimeSection}>
          {React.createElement('input', {
            type: 'date',
            value: dateValue,
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDateValue(event.target.value),
            style: datetimeInputStyle,
            'aria-label': 'Выбор даты записи',
          })}
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              {React.createElement(
                'select',
                {
                  value: hourPart,
                  onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                    setTimeValue(`${event.target.value}:${minutePart}`),
                  style: selectStyle,
                  'aria-label': 'Часы записи',
                },
                hourOptions.map((option) => React.createElement('option', { key: option, value: option }, option)),
              )}
            </View>
            <View style={[styles.timeCol, { marginLeft: 12 }]}>
              {React.createElement(
                'select',
                {
                  value: minutePart,
                  onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
                    setTimeValue(`${hourPart}:${event.target.value}`),
                  style: selectStyle,
                  'aria-label': 'Минуты записи',
                },
                minuteOptions.map((option) => React.createElement('option', { key: option, value: option }, option)),
              )}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onClose} style={styles.btn} accessibilityRole="button" accessibilityLabel="Отмена добавления записи">
            <Text style={styles.btnText}>Отмена</Text>
          </Pressable>
          <Pressable
            onPress={save}
            style={[styles.btn, styles.btnPrimary]}
            accessibilityRole="button"
            accessibilityLabel="Сохранить запись"
          >
            <Text style={styles.btnTextPrimary}>Сохранить</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default AddJournalEntryModalWeb;
