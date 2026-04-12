import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';

import {
  FeastCountdownCard,
  FastCountdownCard,
} from '@spirit/dashboard-feature';
import { palette } from '@spirit/prayer-feature/theme';
import LiturgyAttendanceCard from '../components/LiturgyAttendanceCard';
import { type TabParamList } from '../navigation/AppNavigator';
import { PRAYER_TITLE_BY_ID } from '../constants/prayers';
import {
  canResumePrayer,
  hydratePrayerResumeState,
  type PrayerResumeState,
} from '../services/prayerResumeState';

type HomeNavigation = NavigationProp<TabParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigation>();
  const [resumeState, setResumeState] =
    React.useState<PrayerResumeState | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const hydrateResume = async () => {
        const state = await hydratePrayerResumeState();
        if (!active) {
          return;
        }

        setResumeState(canResumePrayer(state) ? state : null);
      };

      void hydrateResume();

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      {resumeState && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Продолжить ${
            PRAYER_TITLE_BY_ID[resumeState.prayerId]
          }`}
          style={({ pressed }) => [
            styles.resumeCard,
            pressed ? styles.resumeCardPressed : null,
          ]}
          onPress={() =>
            navigation.navigate('Молитвослов', {
              initial: false,
              screen: 'Молитва',
              params: {
                prayerId: resumeState.prayerId,
                resumeSavedPosition: true,
              },
            })
          }
        >
          <Text style={styles.resumeEyebrow}>Незавершённое чтение</Text>
          <Text style={styles.resumeTitle}>
            Продолжить {PRAYER_TITLE_BY_ID[resumeState.prayerId]}
          </Text>
          <Text style={styles.resumeSubtitle}>
            Вернуться к последнему месту в молитве
          </Text>
        </Pressable>
      )}

      <FeastCountdownCard style={styles.cardSpacing} />
      <FastCountdownCard style={styles.cardSpacing} />
      <LiturgyAttendanceCard />
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
  cardSpacing: {
    marginBottom: 24,
  },
  resumeCard: {
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.accent,
  },
  resumeCardPressed: {
    opacity: 0.9,
  },
  resumeEyebrow: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: palette.mutedInk,
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.ink,
  },
  resumeSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: palette.mutedInk,
  },
});

export default HomeScreen;
