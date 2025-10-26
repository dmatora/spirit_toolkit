import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { loadPrayer, type PrayerId } from '../utils/prayerLoader';
import type { PrayerBlock } from '../types/prayer';
import PrayerRenderer from '../components/PrayerRenderer';

type Props = {
  prayerId?: PrayerId;
  scrollSource?: 'internal' | 'external';
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  externalContainer: { flex: 1 },
  status: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statusText: {
    marginTop: 12,
    textAlign: 'center',
  },
});

const PrayerScreen: React.FC<Props> = ({ prayerId = 'liturgy', scrollSource = 'internal' }) => {
  const [blocks, setBlocks] = useState<PrayerBlock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPrayer = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const loadedBlocks = await loadPrayer(prayerId);
        if (!cancelled) {
          setBlocks(loadedBlocks);
        }
      } catch (err) {
        if (!cancelled) {
          const resolvedError = err instanceof Error ? err : new Error(String(err));
          setError(resolvedError);
          console.warn('[PrayerScreen:web] failed to load prayer', resolvedError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPrayer();

    return () => {
      cancelled = true;
    };
  }, [prayerId]);

  if (isLoading) {
    return (
      <View style={styles.status}>
        <ActivityIndicator />
        <Text style={styles.statusText}>Загрузка молитвы…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.status}>
        <Text style={styles.statusText}>Не удалось загрузить молитву. Попробуйте позже.</Text>
      </View>
    );
  }

  const containerStyle =
    scrollSource === 'external' ? styles.externalContainer : styles.container;

  return (
    <View style={containerStyle}>
      <PrayerRenderer blocks={blocks} />
    </View>
  );
};

export default PrayerScreen;
