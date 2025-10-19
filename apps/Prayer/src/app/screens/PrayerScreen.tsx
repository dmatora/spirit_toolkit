import React, { useEffect, useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { palette } from '@spirit/prayer-feature/theme';
import PrayerRenderer from '../components/PrayerRenderer';
import type { PrayerBlock } from '../types/prayer';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.paper },
  scroll: { paddingBottom: 24 },
});

const PRAYERS: Record<string, PrayerBlock[]> = {
  liturgy: require('../../assets/prayers/liturgy.json'),
  evening: require('../../assets/prayers/evening.json'),
};

const PrayerScreen = () => {
  const route = useRoute<any>();
  const prayerId: string = route?.params?.prayerId ?? 'liturgy';

  useEffect(() => {
    console.log(`EVENT: Prayer screen opened for '${prayerId}'`);
  }, [prayerId]);

  const data: PrayerBlock[] = useMemo(() => {
    const payload = PRAYERS[prayerId] ?? PRAYERS['liturgy'];
    return payload as unknown as PrayerBlock[];
  }, [prayerId]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PrayerRenderer blocks={data} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrayerScreen;
