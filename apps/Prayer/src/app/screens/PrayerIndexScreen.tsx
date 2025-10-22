import React from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { palette } from '@spirit/prayer-feature/theme';

import { PRAYER_OPTIONS, type PrayerOption } from '../constants/prayers';
import type { PrayerStackParamList } from '../navigation/PrayerNavigator';

type PrayerNavigation = NavigationProp<PrayerStackParamList>;

const PrayerIndexScreen = () => {
  const navigation = useNavigation<PrayerNavigation>();

  return (
    <SafeAreaView style={styles.container}>
      <Text accessibilityRole="header" style={styles.header}>
        Выберите молитву
      </Text>
      <FlatList<PrayerOption>
        data={PRAYER_OPTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={`Открыть: ${item.title}`}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            onPress={() => navigation.navigate('Молитва', { prayerId: item.id })}
          >
            <Text style={styles.itemTitle}>{item.title}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.paper,
    paddingVertical: 24,
  },
  header: {
    fontSize: 24,
    fontWeight: '600',
    color: palette.ink,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  item: {
    borderRadius: 12,
    backgroundColor: palette.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  itemPressed: {
    opacity: 0.85,
  },
  itemTitle: {
    fontSize: 18,
    color: palette.ink,
  },
});

export default PrayerIndexScreen;
