import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette } from '@spirit/prayer-feature/theme';
import { addJournalEntry } from '../services/journalDb';
import { triggerSync } from '../services/journalSync';
import { PRAYER_OPTIONS } from '../constants/prayers';
import type { PrayerId } from '@spirit/prayer-feature';

type Props = { visible: boolean; onClose: () => void; onSaved?: () => void };

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '88%', maxWidth: 520, backgroundColor: palette.card, borderRadius: 18, padding: 18, borderColor: palette.divider, borderWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 18, fontWeight: '700', color: palette.ink, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: palette.mutedInk, textTransform: 'uppercase', marginTop: 10, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: palette.chipBg, borderColor: palette.divider, borderWidth: 1 },
  chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  chipText: { color: palette.mutedInk, fontWeight: '600' },
  chipTextActive: { color: palette.paper },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, borderColor: palette.divider, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: palette.paper, marginTop: 8 },
  rowText: { color: palette.ink, fontSize: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: palette.chipBg },
  btnPrimary: { backgroundColor: palette.accent },
  btnText: { color: palette.ink, fontWeight: '600' },
  btnTextPrimary: { color: palette.paper, fontWeight: '700' },
});

const formatDate = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const formatTime = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const AddJournalEntryModal: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const [prayerId, setPrayerId] = useState<PrayerId>('liturgy');
  const [dt, setDt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onChange = (_: unknown, value?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }

    if (value) {
      setDt(value);
    }
  };

  const save = async () => {
    try {
      await addJournalEntry(prayerId, Math.floor(dt.getTime() / 1000));
      onSaved?.();
      triggerSync();
      onClose();
    } catch (error) {
      console.warn('[AddJournalEntryModal] failed to save', error);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть модальное окно добавления записи">
        <Pressable style={styles.card} onPress={() => {}} accessibilityLabel="Форма добавления записи">
          <Text style={styles.title}>Новая запись</Text>
          <Text style={styles.sectionTitle}>Молитва</Text>
          <View style={styles.chipsRow}>
            {PRAYER_OPTIONS.map(opt => (
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
          <Pressable
            style={styles.row}
            onPress={() => {
              setShowDatePicker(true);
              setShowTimePicker(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Выбрать дату: ${formatDate(dt)}`}
          >
            <Text style={styles.rowText}>{formatDate(dt)}</Text>
            <Ionicons name="calendar-outline" size={18} color={palette.mutedInk} />
          </Pressable>
          <Pressable
            style={styles.row}
            onPress={() => {
              setShowTimePicker(true);
              setShowDatePicker(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Выбрать время: ${formatTime(dt)}`}
          >
            <Text style={styles.rowText}>{formatTime(dt)}</Text>
            <Ionicons name="time-outline" size={18} color={palette.mutedInk} />
          </Pressable>

          {(showDatePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={dt}
              mode="date"
              onChange={onChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          )}
          {(showTimePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={dt}
              mode="time"
              onChange={onChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          )}

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
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default AddJournalEntryModal;
