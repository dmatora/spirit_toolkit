import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const JournalScreen = () => (
  <View style={styles.container}>
    <Text>Экран Журнала</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default JournalScreen;