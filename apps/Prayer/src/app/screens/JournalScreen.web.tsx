import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette } from '@spirit/prayer-feature/theme';

import {
  deleteJournalEntry,
  getAllJournalEntries,
  type JournalEntry,
} from '../services/journalDb';
import { onSynced, triggerSync } from '../services/journalSync.web';
import AddJournalEntryModal from '../components/AddJournalEntryModal.web';

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString('ru-RU');

const JournalScreen = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleDelete = (id: number) => {
    const runDeletion = async () => {
      try {
        await deleteJournalEntry(id);
        setEntries((prev) => prev.filter((entry) => entry.id !== id));
        triggerSync();
      } catch (err) {
        console.warn('[JournalScreen] failed to delete entry', err);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed =
        typeof window === 'undefined' || typeof window.confirm !== 'function'
          ? true
          : window.confirm('Вы уверены, что хотите удалить эту запись?');
      if (confirmed) {
        runDeletion();
      }
      return;
    }

    Alert.alert('Удалить запись', 'Вы уверены, что хотите удалить эту запись?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          runDeletion();
        },
      },
    ]);
  };

  const loadEntries = useCallback(
    async (
      shouldUpdate: () => boolean = () => true,
      options?: { silent?: boolean },
    ) => {
      const showSpinner = !options?.silent;

      if (shouldUpdate() && showSpinner) {
        setIsLoading(true);
      }

      try {
        const rows = await getAllJournalEntries();
        if (shouldUpdate()) {
          setEntries(rows);
          setError(undefined);
        }
      } catch (err) {
        console.warn('[JournalScreen] failed to load journal entries', err);
        if (shouldUpdate()) {
          setError('Не удалось загрузить записи');
        }
      } finally {
        if (shouldUpdate() && showSpinner) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let isActive = true;
    loadEntries(() => isActive);
    return () => {
      isActive = false;
    };
  }, [loadEntries]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSynced.subscribe(() => {
      if (!isMounted) {
        return;
      }
      loadEntries(() => isMounted, { silent: true });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadEntries]);

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
        contentContainerStyle={
          entries.length === 0
            ? [styles.emptyContainer, styles.listContent]
            : styles.listContent
        }
      />
      <Pressable
        style={styles.fab}
        accessibilityLabel="Добавить запись"
        accessibilityRole="button"
        onPress={() => setIsAddOpen(true)}
      >
        <Ionicons name="add" size={28} color={palette.paper} />
      </Pressable>
      <AddJournalEntryModal
        visible={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSaved={() => {
          loadEntries();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: palette.paper,
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
  listContent: {
    paddingBottom: 96,
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
  },
  deleteBtn: {
    padding: 8,
    alignSelf: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});

export default JournalScreen;
