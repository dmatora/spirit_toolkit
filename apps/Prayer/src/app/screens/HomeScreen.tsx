import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FeastCountdownCard from '../components/FeastCountdownCard';

const HomeScreen = () => (
  <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <FeastCountdownCard style={styles.cardSpacing} />
    <View style={styles.content}>
      <Text style={styles.title}>Главный экран</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSpacing: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});

export default HomeScreen;
