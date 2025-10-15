import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FeastCountdownCard from '../components/FeastCountdownCard';

const HomeScreen = () => (
  <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <FeastCountdownCard style={styles.cardSpacing} />
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  cardSpacing: {
    marginBottom: 24,
  },
});

export default HomeScreen;
