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
import MeasureProgressBar from '../components/MeasureProgressBar';
import ServiceMap from '../components/ServiceMap';
import { extractMajorSections } from '../utils/serviceMap';
import { getSectionsSignature } from '../utils/sections';
import useEvaluationDate from '../hooks/useEvaluationDate';
import type { PrayerBlock } from '../types/prayer';

const PROGRAMMATIC_SCROLL_THRESHOLD = 12; // widened to reduce rounding misses
const PENDING_END_DEBOUNCE_MS = 100;
const PROGRAMMATIC_SCROLL_BASE_MS = 400; // base duration
const PROGRAMMATIC_SCROLL_PER_PX_MS = 0.6; // ms per px distance
const MIN_PROGRAMMATIC_SCROLL_MS = 1200;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.paper },
  topBar: {
    backgroundColor: palette.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
  },
  mapContainer: {
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
  const contentHeightRef = useRef<number>(0);
  const containerHeightRef = useRef<number>(0);
  const skipMomentumEndCountRef = useRef(0);
  const getMaxScrollableY = () =>
    Math.max(0, contentHeightRef.current - containerHeightRef.current);
  const programmaticScrollRef = useRef<{
    active: boolean;
    targetY: number | null;
    timeoutId: ReturnType<typeof setTimeout> | null;
    guardMomentum: boolean;
    pendingEnd: boolean;
    settleTimeoutId: ReturnType<typeof setTimeout> | null;
  }>({
    active: false,
    targetY: null,
    timeoutId: null,
    guardMomentum: false,
    pendingEnd: false,
    settleTimeoutId: null,
  });
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>(undefined);
  const [measuredCount, setMeasuredCount] = useState<number>(0);
  const prevSectionsSigRef = useRef<string | null>(null);

  useEffect(() => {
    console.log(`EVENT: Prayer screen opened for '${prayerId}'`);
  }, [prayerId]);

  useEffect(() => {
    const ref = programmaticScrollRef.current;
    if (ref.timeoutId) {
      clearTimeout(ref.timeoutId);
    }
    if (ref.settleTimeoutId) {
      clearTimeout(ref.settleTimeoutId);
    }
    programmaticScrollRef.current = {
      active: false,
      targetY: null,
      timeoutId: null,
      guardMomentum: false,
      pendingEnd: false,
      settleTimeoutId: null,
    };
    sectionPositionsRef.current = {};
    lastScrollYRef.current = 0;
    contentHeightRef.current = 0;
    containerHeightRef.current = 0;
    setMeasuredCount(0);
    setActiveSectionId(undefined);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
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

  const sectionsSig = useMemo(() => getSectionsSignature(sections), [sections]);

  const sectionsCount = sections.length;
  const sectionIndexLookup = useMemo(() => {
    const lookup: Record<number, string> = {};
    sections.forEach((section) => {
      lookup[section.index] = section.id;
    });
    return lookup;
  }, [sections]);

  const isCalculating = sectionsCount > 0 && measuredCount < sectionsCount;
  const calcProgress = sectionsCount > 0 ? measuredCount / sectionsCount : 0;
  const isPositionsReady = sectionsCount > 0 && measuredCount >= sectionsCount;

  const computeActiveSectionIdForY = useCallback(
    (y: number): string | undefined => {
    const maxY = typeof getMaxScrollableY === 'function' ? getMaxScrollableY() : 0;
    const clampedY = Math.max(0, Math.min(y, maxY));
    const positions = sectionPositionsRef.current as Record<string, number>;
    let current: { id: string; y: number } | undefined;
    for (const section of sections) {
      const sectionY = positions[section.id];
      if (typeof sectionY === 'number' && sectionY <= clampedY + 1) {
        if (!current || sectionY > current.y) {
          current = { id: section.id, y: sectionY };
        }
      }
    }
    const fallback = sections.find((section) => typeof positions[section.id] === 'number');
    return current?.id ?? fallback?.id;
    },
    [sections],
  );

  function endProgrammaticScroll() {
    const ref = programmaticScrollRef.current;
    ref.active = false;
    ref.targetY = null;
    ref.pendingEnd = false;
    if (ref.settleTimeoutId) {
      clearTimeout(ref.settleTimeoutId);
      ref.settleTimeoutId = null;
    }
    if (ref.timeoutId) {
      clearTimeout(ref.timeoutId);
      ref.timeoutId = null;
    }
  }

  function beginProgrammaticScroll(targetY: number) {
    const ref = programmaticScrollRef.current;
    const currentY = lastScrollYRef.current ?? 0;
    const distance = Math.abs(currentY - targetY);
    const dynamicTimeout = Math.max(
      MIN_PROGRAMMATIC_SCROLL_MS,
      Math.ceil(PROGRAMMATIC_SCROLL_BASE_MS + PROGRAMMATIC_SCROLL_PER_PX_MS * distance),
    );
    ref.active = true;
    ref.targetY = targetY;
    ref.guardMomentum = true;
    ref.pendingEnd = false;
    if (ref.settleTimeoutId) {
      clearTimeout(ref.settleTimeoutId);
      ref.settleTimeoutId = null;
    }
    if (ref.timeoutId) {
      clearTimeout(ref.timeoutId);
    }
    ref.timeoutId = setTimeout(() => {
      const finalY = lastScrollYRef.current || 0;
      const id = computeActiveSectionIdForY(finalY);
      if (id) {
        const positions = sectionPositionsRef.current as Record<string, number>;
        const pos = positions[id];
        if (typeof pos === 'number' && scrollRef.current) {
          scrollRef.current.scrollTo({ y: pos, animated: false });
        }
        setActiveSectionId(id);
      }
      programmaticScrollRef.current.guardMomentum = false;
      endProgrammaticScroll();
    }, dynamicTimeout);
  }

  useEffect(() => {
    const prevSig = prevSectionsSigRef.current;
    if (prevSig === null) {
      prevSectionsSigRef.current = sectionsSig;
      sectionPositionsRef.current = {};
      setActiveSectionId(undefined);
      setMeasuredCount(0);
      console.debug('[PrayerScreen] sections signature initialized; performed initial reset');
      return;
    }

    if (prevSig !== sectionsSig) {
      prevSectionsSigRef.current = sectionsSig;
      sectionPositionsRef.current = {};
      setActiveSectionId(undefined);
      setMeasuredCount(0);
      console.debug('[PrayerScreen] sections signature changed; reset measurement state', {
        prevSig,
        sectionsSig,
      });
    } else {
      console.debug(
        '[PrayerScreen] sections signature unchanged; preserving measurement state',
      );
    }
  }, [sectionsSig]);

  useEffect(() => {
    return () => {
      const ref = programmaticScrollRef.current;
      if (ref.timeoutId) {
        clearTimeout(ref.timeoutId);
        ref.timeoutId = null;
      }
      if (ref.settleTimeoutId) {
        clearTimeout(ref.settleTimeoutId);
        ref.settleTimeoutId = null;
      }
      ref.active = false;
      ref.targetY = null;
      ref.pendingEnd = false;
      ref.guardMomentum = false;
    };
  }, []);

  // Single source of truth: initialize activeSectionId only here when positions are ready.
  useEffect(() => {
    if (!sections.length) {
      return;
    }
    if (!activeSectionId && isPositionsReady) {
      const y = lastScrollYRef.current || 0;
      const id = computeActiveSectionIdForY(y);
      if (id) {
        setActiveSectionId(id);
      }
    }
  }, [isPositionsReady, activeSectionId, sections, computeActiveSectionIdForY]);

  const handleSectionLayout = useCallback(
    (_block: PrayerBlock, index: number, y: number) => {
      const sectionId = sectionIndexLookup[index];
      if (!sectionId) return;
      const positions = sectionPositionsRef.current as Record<string, number>;
      if (typeof positions[sectionId] !== 'number') {
        positions[sectionId] = y;
        setMeasuredCount((count) => {
          const next = count + 1;
          return next;
        });
      }
    },
    [sectionIndexLookup, sectionsCount],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      lastScrollYRef.current = y;
      const ref = programmaticScrollRef.current;
      if (ref.active) {
        const target = ref.targetY;
        if (typeof target === 'number' && Math.abs(y - target) <= PROGRAMMATIC_SCROLL_THRESHOLD) {
          ref.pendingEnd = true;
          if (ref.settleTimeoutId) {
            clearTimeout(ref.settleTimeoutId);
          }
          const scheduledY = y;
          ref.settleTimeoutId = setTimeout(() => {
            const latestRef = programmaticScrollRef.current;
            if (
              latestRef.pendingEnd &&
              Math.abs(lastScrollYRef.current - scheduledY) <= PROGRAMMATIC_SCROLL_THRESHOLD
            ) {
              const finalY = lastScrollYRef.current || 0;
              const id = computeActiveSectionIdForY(finalY);
              setActiveSectionId(id);
              endProgrammaticScroll();
            }
          }, PENDING_END_DEBOUNCE_MS);
        }
        return;
      }
      if (ref.guardMomentum) {
        return;
      }
      const nextId = computeActiveSectionIdForY(y);
      setActiveSectionId(nextId);
    },
    [endProgrammaticScroll, computeActiveSectionIdForY],
  );

  const handleSelectSection = useCallback(
    (sectionId: string) => {
      const currentY = lastScrollYRef.current || 0;
      scrollRef.current?.scrollTo({ y: Math.max(0, currentY), animated: false });
      endProgrammaticScroll();
      programmaticScrollRef.current.guardMomentum = false;
      skipMomentumEndCountRef.current += 1;
      console.debug('[PrayerScreen] force-cancelled momentum prior to programmatic select', {
        sectionId,
        skipCount: skipMomentumEndCountRef.current,
      });

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
        {isCalculating && (
          <MeasureProgressBar
            progress={calcProgress}
            label={`Рассчёт разделов: ${measuredCount}/${sectionsCount}`}
            style={{ paddingHorizontal: 20, paddingBottom: 8 }}
          />
        )}
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        onContentSizeChange={(_w, h) => {
          contentHeightRef.current = h;
        }}
        onLayout={(event) => {
          containerHeightRef.current = event.nativeEvent.layout.height;
        }}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          if (programmaticScrollRef.current.active) {
            endProgrammaticScroll();
            programmaticScrollRef.current.guardMomentum = false;
          }
        }}
        onMomentumScrollBegin={() => {
          if (programmaticScrollRef.current.active) {
            programmaticScrollRef.current.guardMomentum = true;
          }
        }}
        onMomentumScrollEnd={() => {
          if (skipMomentumEndCountRef.current > 0) {
            skipMomentumEndCountRef.current -= 1;
            console.debug('[PrayerScreen] skipped stale momentum-end event', {
              remainingSkips: skipMomentumEndCountRef.current,
            });
            return;
          }
          if (
            programmaticScrollRef.current.active ||
            programmaticScrollRef.current.guardMomentum
          ) {
            console.debug(
              '[PrayerScreen] ignored momentum-end while programmatic scroll is guarding',
              {
                active: programmaticScrollRef.current.active,
                guard: programmaticScrollRef.current.guardMomentum,
              },
            );
            return;
          }
          endProgrammaticScroll();
          programmaticScrollRef.current.guardMomentum = false;
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
