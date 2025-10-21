import React from 'react';
import { Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllJournalEntries, type JournalEntry } from '../services/journalDb';
import { palette } from '@spirit/prayer-feature/theme';

type Props = {
  style?: StyleProp<ViewStyle>;
};

const shadowStyle = Platform.select({
  android: { elevation: 6 },
  default: {
    shadowColor: palette.ink,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
});

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: palette.card,
    borderColor: palette.divider,
    borderWidth: StyleSheet.hairlineWidth,
    ...(shadowStyle ?? {}),
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: palette.mutedInk,
    marginBottom: 10,
  },
  statRow: {
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: palette.mutedInk,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
});

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDateRu(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const LiturgyAttendanceCard: React.FC<Props> = ({ style }) => {
  const [lastVisit, setLastVisit] = React.useState<Date | null>(null);
  const [count30, setCount30] = React.useState<number>(0);

  const computeStats = React.useCallback((rows: JournalEntry[]) => {
    const liturgyRows = rows.filter((r) => r.prayer_id === 'liturgy');

    if (liturgyRows.length > 0) {
      const maxTs = Math.max(...liturgyRows.map((r) => r.timestamp));
      setLastVisit(new Date(maxTs * 1000));
    } else {
      setLastVisit(null);
    }

    const today = startOfDayLocal(new Date());
    const since = new Date(today);
    since.setDate(today.getDate() - 29);

    const uniqueDays = new Set<string>();
    for (const r of liturgyRows) {
      const d = startOfDayLocal(new Date(r.timestamp * 1000));
      if (d >= since && d <= today) {
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        uniqueDays.add(key);
      }
    }
    setCount30(uniqueDays.size);
  }, []);

  const load = React.useCallback(async () => {
    try {
      const all = await getAllJournalEntries();
      computeStats(all);
    } catch (_err) {
      // ignore
    }
  }, [computeStats]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        if (active) await load();
      })();
      return () => {
        active = false;
      };
    }, [load]),
  );
  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>Посещаемость</Text>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Последнее посещение Литургии:</Text>
        <Text style={styles.statValue}>{lastVisit ? formatDateRu(lastVisit) : '—'}</Text>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Всего посещений за последние 30 дней:</Text>
        <Text style={styles.statValue}>{count30}</Text>
      </View>
    </View>
  );
};

export default LiturgyAttendanceCard;
