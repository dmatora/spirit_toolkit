import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { palette } from '@spirit/prayer-feature/theme';
import PrayerRenderer from '../components/PrayerRenderer';
import ServiceMap from '../components/ServiceMap';
import { extractMajorSections } from '../utils/serviceMap';
import useEvaluationDate from '../hooks/useEvaluationDate';
import type { PrayerBlock } from '../types/prayer';

const PROGRAMMATIC_SCROLL_THRESHOLD = 4;
const PROGRAMMATIC_SCROLL_TIMEOUT_MS = 1200;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.paper },
  topBar: {
    backgroundColor: palette.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
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
  const lastScrollYRef = useRef(0);
  const programmaticScrollRef = useRef<{
    active: boolean;
    targetY: number | null;
    timeoutId: ReturnType<typeof setTimeout> | null;
    guardMomentum: boolean;
  }>({
    active: false,
    targetY: null,
    timeoutId: null,
    guardMomentum: false,
  });
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    console.log(`EVENT: Prayer screen opened for '${prayerId}'`);
  }, [prayerId]);

  const data: PrayerBlock[] = useMemo(() => {
    const payload = PRAYERS[prayerId] ?? PRAYERS['liturgy'];
    return payload as unknown as PrayerBlock[];
  }, [prayerId]);

  const evaluationDate = useEvaluationDate();

  const sections = useMemo(
    () => extractMajorSections(data, evaluationDate),
    [data, evaluationDate],
  );

  const sectionIndexLookup = useMemo(() => {
    const lookup: Record<number, string> = {};
    sections.forEach((section) => {
      lookup[section.index] = section.id;
    });
    return lookup;
  }, [sections]);

  const isPositionsReady =
    sections.length > 0 && Object.keys(sectionPositionsRef.current).length >= sections.length;

  function computeActiveSectionIdForY(y: number): string | undefined {
    const positions = sectionPositionsRef.current as Record<string, number>;
    let current: { id: string; y: number } | undefined;
    for (const section of sections) {
      const sectionY = positions[section.id];
      if (typeof sectionY === 'number' && sectionY <= y + 1) {
        if (!current || sectionY > current.y) {
          current = { id: section.id, y: sectionY };
        }
      }
    }
    const fallback = sections.find((section) => typeof positions[section.id] === 'number');
    return current?.id ?? fallback?.id;
  }

  function endProgrammaticScroll() {
    const ref = programmaticScrollRef.current;
    ref.active = false;
    ref.targetY = null;
    if (ref.timeoutId) {
      clearTimeout(ref.timeoutId);
      ref.timeoutId = null;
    }
  }

  function beginProgrammaticScroll(targetY: number) {
    const ref = programmaticScrollRef.current;
    ref.active = true;
    ref.targetY = targetY;
    if (ref.timeoutId) {
      clearTimeout(ref.timeoutId);
    }
    ref.timeoutId = setTimeout(() => {
      endProgrammaticScroll();
    }, PROGRAMMATIC_SCROLL_TIMEOUT_MS);
  }

  useEffect(() => {
    sectionPositionsRef.current = {};
    setActiveSectionId(undefined);
  }, [sections]);

  useEffect(() => {
    return () => {
      const ref = programmaticScrollRef.current;
      if (ref.timeoutId) {
        clearTimeout(ref.timeoutId);
        ref.timeoutId = null;
      }
      ref.active = false;
      ref.targetY = null;
    };
  }, []);
  const handleSectionLayout = useCallback(
    (_block: PrayerBlock, index: number, y: number) => {
      const sectionId = sectionIndexLookup[index];
      if (!sectionId) return;
      sectionPositionsRef.current[sectionId] = y;
    },
    [sectionIndexLookup],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      lastScrollYRef.current = y;
      if (programmaticScrollRef.current.active) {
        const target = programmaticScrollRef.current.targetY;
        if (typeof target === 'number' && Math.abs(y - target) <= PROGRAMMATIC_SCROLL_THRESHOLD) {
          endProgrammaticScroll();
        }
        if (programmaticScrollRef.current.active) {
          return;
        }
      }
      const nextId = computeActiveSectionIdForY(y);
      setActiveSectionId(nextId);
    },
    [sections, endProgrammaticScroll, computeActiveSectionIdForY],
  );

  const handleSelectSection = useCallback(
    (sectionId: string) => {
      setActiveSectionId(sectionId);
      const positions = sectionPositionsRef.current;
      let targetOffset: number | null = null;

      const directOffset = positions[sectionId];
      if (typeof directOffset === 'number') {
        targetOffset = directOffset;
      } else {
        const sectionIndex = sections.findIndex((section) => section.id === sectionId);
        if (sectionIndex === -1) {
          targetOffset = 0;
        } else {
          for (let i = sectionIndex - 1; i >= 0; i -= 1) {
            const previousOffset = positions[sections[i].id];
            if (typeof previousOffset === 'number') {
              targetOffset = previousOffset;
              break;
            }
          }

          if (targetOffset === null) {
            for (let i = sectionIndex + 1; i < sections.length; i += 1) {
              const nextOffset = positions[sections[i].id];
              if (typeof nextOffset === 'number') {
                targetOffset = nextOffset;
                break;
              }
            }
          }

          if (targetOffset === null) {
            targetOffset = 0;
          }
        }
      }

      const finalOffset = targetOffset ?? 0;
      beginProgrammaticScroll(finalOffset);
      scrollRef.current?.scrollTo({ y: finalOffset, animated: true });
    },
    [sections, beginProgrammaticScroll],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <ServiceMap
          sections={sections}
          activeSectionId={activeSectionId}
          onSelect={handleSelectSection}
          style={styles.mapContainer}
          isDisabled={!isPositionsReady}
        />
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          if (programmaticScrollRef.current.active) {
            endProgrammaticScroll();
          }
        }}
        onMomentumScrollEnd={() => {
          endProgrammaticScroll();
          const finalY = lastScrollYRef.current || 0;
          const id = computeActiveSectionIdForY(finalY);
          setActiveSectionId(id);
        }}
        scrollEventThrottle={16}
      >
        <PrayerRenderer
          blocks={data}
          onMajorSectionLayout={handleSectionLayout}
          sectionIdLookup={sectionIndexLookup}
          evaluationDate={evaluationDate}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrayerScreen;
