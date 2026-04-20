import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '@spirit/prayer-feature/theme';
import type { PrayerId } from '../utils/prayerLoader';
import type { LiturgicalPeriodInfo } from '../utils/liturgicalPeriods';
import {
  markLiturgicalPeriodNoticeSeen,
  shouldShowLiturgicalPeriodNotice,
} from '../services/liturgicalCalendar';

type Props = {
  period: LiturgicalPeriodInfo;
  prayerId: PrayerId;
  onOpenSettings?: () => void;
};

const TARGET_PRAYER_IDS: PrayerId[] = ['morning_rule', 'evening_rule'];

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    padding: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accentSoft,
    backgroundColor: palette.chipBg,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: palette.mutedInk,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.divider,
    backgroundColor: palette.card,
  },
  primaryButton: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
  },
  primaryButtonText: {
    color: palette.paper,
  },
});

const LiturgicalPeriodNotice = ({ period, prayerId, onOpenSettings }: Props) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      if (!TARGET_PRAYER_IDS.includes(prayerId) || period.key === 'ordinary') {
        if (active) {
          setIsVisible(false);
        }
        return;
      }

      const shouldShow = await shouldShowLiturgicalPeriodNotice(period);
      if (!active) {
        return;
      }

      setIsVisible(shouldShow);
      if (shouldShow) {
        void markLiturgicalPeriodNoticeSeen(period);
      }
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, [period, prayerId]);

  if (!isVisible) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="summary"
      accessibilityLabel={`Литургический календарь: ${period.title}`}
    >
      <Text style={styles.title}>Молитвенное правило обновлено</Text>
      <Text style={styles.body}>
        Сейчас действует период «{period.title}». Текст утреннего и вечернего
        правила адаптирован автоматически.
      </Text>
      <View style={styles.actions}>
        {onOpenSettings && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Открыть настройки литургического календаря"
            style={[styles.button, styles.primaryButton]}
            onPress={() => {
              setIsVisible(false);
              onOpenSettings();
            }}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              Настройки
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть уведомление"
          style={styles.button}
          onPress={() => setIsVisible(false)}
        >
          <Text style={styles.buttonText}>Понятно</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default LiturgicalPeriodNotice;
