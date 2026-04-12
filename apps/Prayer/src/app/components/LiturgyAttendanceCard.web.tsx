import React from 'react';
import { Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useEvaluationDate } from '@spirit/prayer-feature';
import { palette } from '@spirit/prayer-feature/theme';
import { pluralizeDaysRu } from '@spirit/prayer-feature/utils/plural';
import { getAllJournalEntries, type JournalEntry } from '../services/journalDb';
import { onSynced } from '../services/journalSync.web';
import {
  ensureSettingsInitialized,
  getLiturgyThresholds,
  type Thresholds,
} from '../services/attendanceConfig';
import {
  COMMUNION_ATTENDANCE_PRAYER_IDS,
  computeAttendanceMetricStats,
  EMPTY_ATTENDANCE_METRIC_STATS,
  LITURGY_ATTENDANCE_PRAYER_IDS,
  type AttendanceMetricStats,
} from '../services/attendanceStats';

type Props = {
  style?: StyleProp<ViewStyle>;
};

type CardStats = {
  liturgy: AttendanceMetricStats;
  communion: AttendanceMetricStats;
};

const COMMUNION_THRESHOLDS: Thresholds = {
  normal: 7,
  warning: 30,
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
  const [stats, setStats] = React.useState<CardStats>({
    liturgy: EMPTY_ATTENDANCE_METRIC_STATS,
    communion: EMPTY_ATTENDANCE_METRIC_STATS,
  });
  const [thresholds, setThresholds] = React.useState<Thresholds>({ normal: 7, warning: 21 });

  const computeStats = React.useCallback((rows: JournalEntry[]) => {
    setStats({
      liturgy: computeAttendanceMetricStats(rows, LITURGY_ATTENDANCE_PRAYER_IDS, evaluationDate),
      communion: computeAttendanceMetricStats(
        rows,
        COMMUNION_ATTENDANCE_PRAYER_IDS,
        evaluationDate,
      ),
    });
  }, [evaluationDate]);

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
    (value: number | null, metricThresholds: Thresholds) => {
      if (value == null) return palette.mutedInk;
      if (value <= metricThresholds.normal) return palette.ink;
      if (value <= metricThresholds.warning) return palette.warning;
      return palette.danger;
    },
    [],
  );

  const formatDaysDisplay = (value: number | null) =>
    value === null ? '—' : value === 0 ? '0' : `${value} ${pluralizeDaysRu(value)}`;

  const liturgyDaysDisplay = formatDaysDisplay(stats.liturgy.daysSince);
  const liturgyDaysColor = getDaysColor(stats.liturgy.daysSince, thresholds);
  const communionDaysDisplay = formatDaysDisplay(stats.communion.daysSince);
  const communionDaysColor = getDaysColor(stats.communion.daysSince, COMMUNION_THRESHOLDS);

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>Посещаемость</Text>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Дней без Литургии:</Text>
        <Text style={[styles.statValue, { color: liturgyDaysColor }]}>{liturgyDaysDisplay}</Text>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Дней без Причастия:</Text>
        <Text style={[styles.statValue, { color: communionDaysColor }]}>
          {communionDaysDisplay}
        </Text>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Всего посещений за последние 30 дней:</Text>
        <Text style={styles.statValue}>{stats.liturgy.uniqueDaysLast30}</Text>
      </View>
    </View>
  );
};

export default LiturgyAttendanceCard;
