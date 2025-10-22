import React from 'react';
import {
  Alert,
  Pressable,
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

import {
  deleteJournalEntry,
  getAllJournalEntries,
  type JournalEntry,
} from '../services/journalDb';

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString('ru-RU');

const JournalScreen = () => {
  const [entries, setEntries] = React.useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const handleDelete = (id: number) => {
    Alert.alert('Удалить запись', 'Вы уверены, что хотите удалить эту запись?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteJournalEntry(id);
            setEntries((prev) => prev.filter((entry) => entry.id !== id));
          } catch (err) {
            console.warn('[JournalScreen] failed to delete entry', err);
          }
        },
      },
    ]);
  };

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
            <View style={{ flex: 1 }}>
              <Text style={styles.prayerId}>{item.prayer_id}</Text>
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
            <Pressable
              accessibilityLabel="Удалить запись"
              accessibilityRole="button"
              onPress={() => handleDelete(item.id)}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={20} color="#7A1E3A" />
            </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
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
  deleteBtn: {
    padding: 8,
    alignSelf: 'center',
  },
});

export default JournalScreen;
