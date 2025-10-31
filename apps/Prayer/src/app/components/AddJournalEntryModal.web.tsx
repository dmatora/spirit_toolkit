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
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.chipBg,
    borderColor: palette.divider,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  chipText: { color: palette.mutedInk, fontWeight: '600' },
  chipTextActive: { color: palette.paper },
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

const formatInputValue = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const AddJournalEntryModalWeb: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const [prayerId, setPrayerId] = useState<PrayerId>('liturgy');
  const [datetimeValue, setDatetimeValue] = useState<string>(() => formatInputValue(new Date()));

  useEffect(() => {
    if (visible) {
      setDatetimeValue(formatInputValue(new Date()));
    }
  }, [visible]);

  const prayerOptions = useMemo(() => PRAYER_OPTIONS, []);

  const save = async () => {
    const timestampMs = Number.isNaN(Date.parse(datetimeValue))
      ? Date.now()
      : new Date(datetimeValue).getTime();
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
        <View style={styles.chipsRow}>
          {prayerOptions.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setPrayerId(opt.id)}
              style={({ pressed }) => [
                styles.chip,
                prayerId === opt.id && styles.chipActive,
                pressed && { opacity: 0.9 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: prayerId === opt.id }}
              accessibilityLabel={`Выбрать: ${opt.title}`}
            >
              <Text style={[styles.chipText, prayerId === opt.id && styles.chipTextActive]}>{opt.title}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Дата и время</Text>
        {React.createElement('input', {
          type: 'datetime-local',
          value: datetimeValue,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDatetimeValue(event.target.value),
          style: datetimeInputStyle,
          'aria-label': 'Выбор даты и времени записи',
        })}

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
