import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeastCountdownCard, FastCountdownCard } from '@spirit/dashboard-feature';
import { palette } from '@spirit/prayer-feature/theme';
import LiturgyAttendanceCard from '../components/LiturgyAttendanceCard';

const HomeScreen: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <FeastCountdownCard style={styles.cardSpacing} />
    <FastCountdownCard style={styles.cardSpacing} />
    <LiturgyAttendanceCard />
  </SafeAreaView>
);

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
});

export default HomeScreen;
