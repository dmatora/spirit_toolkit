import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { palette } from '@spirit/prayer-feature/theme';
import PrayerRenderer from '../components/PrayerRenderer';
import ServiceMap from '../components/ServiceMap';
import ServiceClockBar from '../components/ServiceClockBar';
import { computeSectionRanges, extractMajorSections } from '../utils/serviceMap';
import { useServiceProgress } from '../hooks/useServiceProgress';
import type { PrayerBlock } from '../types/prayer';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.paper },
  topBar: {
    backgroundColor: palette.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
  },
  clockBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  mapContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
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

  const evaluationDate = useMemo(() => new Date(), [data]);

  const sections = useMemo(
    () => extractMajorSections(data, evaluationDate),
    [data, evaluationDate],
  );
  const { startTime, setStartTime, minutesSinceStart, activeSectionId } = useServiceProgress(sections);

  const sectionIndexLookup = useMemo(() => {
    const lookup: Record<number, string> = {};
    sections.forEach((section) => {
      lookup[section.index] = section.id;
    });
    return lookup;
  }, [sections]);

  const sectionRanges = useMemo(
    () => computeSectionRanges(data, sections, evaluationDate),
    [data, sections, evaluationDate],
  );

  const activeSectionRange = useMemo(
    () => sectionRanges.find((range) => range.id === activeSectionId),
    [sectionRanges, activeSectionId],
  );

  const handleStartTimeChange = useCallback(
    (next: Date) => {
      setStartTime(next);
    },
    [setStartTime],
  );

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

  const handleSelectSection = useCallback(
    (sectionId: string) => {
      const positions = sectionPositionsRef.current;
      const directOffset = positions[sectionId];

      if (typeof directOffset === 'number') {
        scrollRef.current?.scrollTo({ y: directOffset, animated: true });
        return;
      }

      const sectionIndex = sections.findIndex((section) => section.id === sectionId);
      if (sectionIndex === -1) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return;
      }

      for (let i = sectionIndex - 1; i >= 0; i -= 1) {
        const previousOffset = positions[sections[i].id];
        if (typeof previousOffset === 'number') {
          scrollRef.current?.scrollTo({ y: previousOffset, animated: true });
          return;
        }
      }

      for (let i = sectionIndex + 1; i < sections.length; i += 1) {
        const nextOffset = positions[sections[i].id];
        if (typeof nextOffset === 'number') {
          scrollRef.current?.scrollTo({ y: nextOffset, animated: true });
          return;
        }
      }

      scrollRef.current?.scrollTo({ y: 0, animated: true });
    },
    [sections],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <ServiceClockBar
          startTime={startTime}
          minutesSinceStart={minutesSinceStart}
          onChange={handleStartTimeChange}
          style={styles.clockBar}
        />
        <ServiceMap
          sections={sections}
          activeSectionId={activeSectionId}
          onSelect={handleSelectSection}
          style={styles.mapContainer}
        />
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <PrayerRenderer
          blocks={data}
          onMajorSectionLayout={handleSectionLayout}
          sectionIdLookup={sectionIndexLookup}
          activeSectionId={activeSectionId}
          activeSectionRange={activeSectionRange}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrayerScreen;
