import React from 'react';
import { View } from 'react-native';
import { Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getAllJournalEntries, type JournalEntry } from '../services/journalDb';

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString('ru-RU');

const JournalScreen = () => {
  const [entries, setEntries] = React.useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const loadEntries = async () => {
        setIsLoading(true);
        try {
          const rows = await getAllJournalEntries();
          if (isActive) {
            setEntries(rows);
            setError(undefined);
          }
        } catch (err) {
          console.warn('[JournalScreen] failed to load journal entries', err);
          if (isActive) {
            setError('Не удалось загрузить записи');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      loadEntries();

      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {isLoading ? <ActivityIndicator style={styles.loader} /> : null}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.prayerId}>{item.prayer_id}</Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.emptyText}>Записей пока нет</Text> : null
        }
        contentContainerStyle={entries.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  loader: {
    marginBottom: 12,
  },
  errorText: {
    marginBottom: 12,
    color: '#cc0000',
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  prayerId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  timestamp: {
    marginTop: 4,
    fontSize: 14,
    color: '#555',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
  },
});

export default JournalScreen;
