import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@spirit/prayer-feature/theme';
import RhythmCard from '../components/RhythmCard';

const RhythmScreen: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RhythmCard />
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 32,
  },
});

export default RhythmScreen;
