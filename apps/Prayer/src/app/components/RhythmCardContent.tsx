import React from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { palette } from '@spirit/prayer-feature/theme';
import { pluralizeDaysRu } from '@spirit/prayer-feature/utils/plural';

import {
  type RhythmStatus,
  type RhythmTrackId,
  type RhythmTrackModel,
  type RhythmTrackWeekModel,
  type YearlyRhythmModel,
} from '../services/rhythmMetrics';

type Props = {
  model: YearlyRhythmModel;
  style?: StyleProp<ViewStyle>;
};

type MonthSection = {
  key: string;
  title: string;
  year: number;
  weeks: RhythmTrackWeekModel[];
};

const STATUS_TONES: Record<
  RhythmStatus,
  { color: string; label: string; fill: string }
> = {
  fresh: {
    color: '#68835A',
    label: 'До 7 дней',
    fill: '#E8F0E1',
  },
  warning: {
    color: '#C5902F',
    label: 'До 30 дней',
    fill: '#FBF1DD',
  },
  danger: {
    color: '#A34D43',
    label: 'Больше 30 дней',
    fill: '#F7E3DF',
  },
};

const shadowStyle = Platform.select({
  android: { elevation: 7 },
  default: {
    shadowColor: palette.ink,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
  },
});

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 28,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.divider,
    ...(shadowStyle ?? {}),
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: palette.mutedInk,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: palette.ink,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: palette.mutedInk,
  },
  legend: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.chipBg,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: palette.mutedInk,
  },
  tabRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.divider,
    backgroundColor: palette.chipBg,
  },
  tabButtonActive: {
    backgroundColor: '#FBF9F3',
    borderColor: palette.accentSoft,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    color: palette.mutedInk,
  },
  tabButtonTextActive: {
    color: palette.ink,
  },
  sectionWrap: {
    marginTop: 18,
  },
  sectionCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: '#FBF9F3',
    borderWidth: 1,
    borderColor: palette.divider,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.ink,
  },
  sectionMeta: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
    color: palette.mutedInk,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthList: {
    marginTop: 16,
    gap: 12,
  },
  monthSection: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.ink,
  },
  monthMeta: {
    fontSize: 12,
    color: palette.mutedInk,
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  weekCell: {
    width: 40,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 12,
  },
  weekCellCurrent: {
    backgroundColor: palette.chipBg,
  },
  weekRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekFootnote: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    color: palette.mutedInk,
  },
  footer: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 18,
    color: palette.mutedInk,
  },
});

const formatDaysSince = (
  daysSince: number,
  hasKnownEntry: boolean
): string => {
  if (!hasKnownEntry) {
    return 'Записи по этой практике пока нет';
  }

  return `${daysSince} ${pluralizeDaysRu(daysSince)} с последнего события`;
};

const formatLastEntryDate = (date: Date | null): string => {
  if (!date) {
    return 'Последняя дата пока не определена';
  }

  return `Последняя запись: ${date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })}`;
};

const formatWeekFootnote = (week: RhythmTrackWeekModel): string => {
  if (week.startDate.getMonth() === week.endDate.getMonth()) {
    return `${week.startDate.getDate()}-${week.endDate.getDate()}`;
  }

  return `${week.startDate.getDate()}/${week.endDate.getDate()}`;
};

const formatMonthTitle = (date: Date): string => {
  const monthLabel = date.toLocaleDateString('ru-RU', { month: 'long' });
  return `${monthLabel.slice(0, 1).toUpperCase()}${monthLabel.slice(1)}`;
};

const buildMonthSections = (weeks: RhythmTrackWeekModel[]): MonthSection[] => {
  const sections = new Map<string, MonthSection>();

  weeks.forEach((week) => {
    const monthStart = new Date(
      week.startDate.getFullYear(),
      week.startDate.getMonth(),
      1
    );
    const key = `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`;

    if (!sections.has(key)) {
      sections.set(key, {
        key,
        title: formatMonthTitle(monthStart),
        year: monthStart.getFullYear(),
        weeks: [],
      });
    }

    sections.get(key)?.weeks.push(week);
  });

  return Array.from(sections.values());
};

const WeekStateRing = ({ week }: { week: RhythmTrackWeekModel }) => {
  const size = 30;
  const center = size / 2;
  const radius = 9.5;
  const strokeWidth = 3.5;
  const tone = STATUS_TONES[week.status];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={palette.divider}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={tone.color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      {week.hasEventThisWeek ? (
        <Circle cx={center} cy={center} r={3.5} fill={tone.color} />
      ) : (
        <Circle cx={center} cy={center} r={3.5} fill={tone.fill} />
      )}
    </Svg>
  );
};

const PracticeSection = ({ track }: { track: RhythmTrackModel }) => {
  const tone = STATUS_TONES[track.currentStatus];
  const monthSections = React.useMemo(
    () => buildMonthSections(track.weeks),
    [track.weeks]
  );

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{track.title}</Text>
          <Text style={styles.sectionMeta}>
            {formatDaysSince(track.currentDaysSince, track.lastEntryDate != null)}
          </Text>
          <Text style={styles.sectionMeta}>
            {formatLastEntryDate(track.lastEntryDate)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: tone.fill }]}>
          <Text style={[styles.statusBadgeText, { color: tone.color }]}>
            {tone.label}
          </Text>
        </View>
      </View>

      <View style={styles.monthList}>
        {monthSections.map((section, index) => (
          <View key={section.key} style={styles.monthSection}>
            <View style={styles.monthHeader}>
              <Text style={styles.monthTitle}>{section.title}</Text>
              {index === 0 ||
              monthSections[index - 1]?.year !== section.year ? (
                <Text style={styles.monthMeta}>{section.year}</Text>
              ) : null}
            </View>

            <View style={styles.weekGrid}>
              {section.weeks.map((week) => (
                <View
                  key={week.key}
                  style={[
                    styles.weekCell,
                    week.isCurrent ? styles.weekCellCurrent : null,
                  ]}
                >
                  <View style={styles.weekRingWrap}>
                    <WeekStateRing week={week} />
                  </View>
                  <Text style={styles.weekFootnote}>
                    {formatWeekFootnote(week)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const RhythmCardContent: React.FC<Props> = ({ model, style }) => {
  const defaultTrackId =
    model.tracks.find((track) => track.id === 'communion')?.id ??
    model.tracks[0]?.id ??
    'communion';
  const [activeTrackId, setActiveTrackId] =
    React.useState<RhythmTrackId>(defaultTrackId);

  React.useEffect(() => {
    if (!model.tracks.some((track) => track.id === activeTrackId)) {
      setActiveTrackId(defaultTrackId);
    }
  }, [activeTrackId, defaultTrackId, model.tracks]);

  const activeTrack =
    model.tracks.find((track) => track.id === activeTrackId) ?? model.tracks[0];

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.eyebrow}>Ритм</Text>
      <Text style={styles.title}>Последние месяцы</Text>
      <Text style={styles.subtitle}>
        Показываем {model.visibleMonthCount} мес. наблюдения: {model.rangeLabel}
        . Цвет означает только степень паузы: зелёный до 7 дней, жёлтый до 30,
        красный больше 30.
      </Text>

      <View style={styles.legend}>
        {(['fresh', 'warning', 'danger'] as RhythmStatus[]).map(
          (status) => (
            <View key={status} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: STATUS_TONES[status].color },
                ]}
              />
              <Text style={styles.legendText}>
                {STATUS_TONES[status].label}
              </Text>
            </View>
          )
        )}
      </View>

      <View style={styles.tabRow}>
        {model.tracks.map((track) => {
          const isActive = track.id === activeTrack?.id;

          return (
            <Pressable
              key={track.id}
              onPress={() => setActiveTrackId(track.id)}
              style={[
                styles.tabButton,
                isActive ? styles.tabButtonActive : null,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Показать ${track.title}`}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  isActive ? styles.tabButtonTextActive : null,
                ]}
              >
                {track.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionWrap}>
        {activeTrack ? <PracticeSection track={activeTrack} /> : null}
      </View>

      <Text style={styles.footer}>
        Центральная точка внутри недели показывает, что событие произошло именно
        в эту неделю. Если записи по практике пока нет, ранние недели сразу
        считаются выраженной паузой. Будущие недели не показываются.
      </Text>
    </View>
  );
};

export default RhythmCardContent;
