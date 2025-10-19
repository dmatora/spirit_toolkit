import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { palette } from '@spirit/prayer-feature/theme';
import PrayerRenderer from '../components/PrayerRenderer';
import ServiceMap from '../components/ServiceMap';
import { extractMajorSections } from '../utils/serviceMap';
import type { PrayerBlock } from '../types/prayer';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.paper },
  mapContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: palette.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
  },
  scroll: { paddingBottom: 24 },
});

const PRAYERS: Record<string, PrayerBlock[]> = {
  liturgy: require('../../assets/prayers/liturgy.json'),
  evening: require('../../assets/prayers/evening.json'),
};

const PrayerScreen = () => {
  const route = useRoute<any>();
  const prayerId: string = route?.params?.prayerId ?? 'liturgy';
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionPositionsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    console.log(`EVENT: Prayer screen opened for '${prayerId}'`);
  }, [prayerId]);

  const data: PrayerBlock[] = useMemo(() => {
    const payload = PRAYERS[prayerId] ?? PRAYERS['liturgy'];
    return payload as unknown as PrayerBlock[];
  }, [prayerId]);

  const sections = useMemo(() => extractMajorSections(data), [data]);

  const sectionIndexLookup = useMemo(() => {
    const lookup: Record<number, string> = {};
    sections.forEach((section) => {
      lookup[section.index] = section.id;
    });
    return lookup;
  }, [sections]);

  useEffect(() => {
    sectionPositionsRef.current = {};
  }, [sections]);

  const handleSectionLayout = useCallback(
    (_block: PrayerBlock, index: number, y: number) => {
      const sectionId = sectionIndexLookup[index];
      if (!sectionId) return;
      sectionPositionsRef.current[sectionId] = y;
    },
    [sectionIndexLookup],
  );

  const handleSelectSection = useCallback((sectionId: string) => {
    const offset = sectionPositionsRef.current[sectionId];
    if (typeof offset === 'number') {
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ServiceMap sections={sections} onSelect={handleSelectSection} style={styles.mapContainer} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <PrayerRenderer blocks={data} onMajorSectionLayout={handleSectionLayout} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrayerScreen;
