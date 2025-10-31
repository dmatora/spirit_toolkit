import React from 'react';
import { Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useEvaluationDate } from '@spirit/prayer-feature';
import { palette } from '@spirit/prayer-feature/theme';
import { startOfDayLocal } from '@spirit/prayer-feature/utils/date';
import { pluralizeDaysRu } from '@spirit/prayer-feature/utils/plural';
import { getAllJournalEntries, type JournalEntry } from '../services/journalDb';
import { onSynced } from '../services/journalSync.web';
import {
  ensureSettingsInitialized,
  getLiturgyThresholds,
  type Thresholds,
} from '../services/attendanceConfig';

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

const LiturgyAttendanceCard: React.FC<Props> = ({ style }) => {
  const evaluationDate = useEvaluationDate();
  const [lastVisit, setLastVisit] = React.useState<Date | null>(null);
  const [count30, setCount30] = React.useState<number>(0);
  const [thresholds, setThresholds] = React.useState<Thresholds>({ normal: 7, warning: 21 });

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

  const refresh = React.useCallback(async () => {
    try {
      await ensureSettingsInitialized();
      const [entries, liturgyThresholds] = await Promise.all([
        getAllJournalEntries(),
        getLiturgyThresholds(),
      ]);
      computeStats(entries);
      setThresholds(liturgyThresholds);
    } catch (_err) {
      // ignore on web
    }
  }, [computeStats]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, evaluationDate]);

  React.useEffect(() => {
    const unsubscribe = onSynced.subscribe(() => {
      refresh();
    });

    return () => {
      unsubscribe();
    };
  }, [refresh]);

  const getDaysColor = React.useCallback(
    (value?: number | null) => {
      if (value == null) return palette.mutedInk;
      if (value <= thresholds.normal) return palette.ink;
      if (value <= thresholds.warning) return palette.warning;
      return palette.danger;
    },
    [thresholds],
  );

  const today = startOfDayLocal(new Date());
  const daysSince = lastVisit
    ? Math.max(
        0,
        Math.round(
          (today.getTime() - startOfDayLocal(lastVisit).getTime()) / (24 * 60 * 60 * 1000),
        ),
      )
    : null;
  const daysDisplay =
    daysSince === null ? '—' : daysSince === 0 ? '0' : `${daysSince} ${pluralizeDaysRu(daysSince)}`;
  const daysColor = getDaysColor(daysSince);

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>Посещаемость</Text>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Дней без Литургии:</Text>
        <Text style={[styles.statValue, { color: daysColor }]}>{daysDisplay}</Text>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Всего посещений за последние 30 дней:</Text>
        <Text style={styles.statValue}>{count30}</Text>
      </View>
    </View>
  );
};

export default LiturgyAttendanceCard;
