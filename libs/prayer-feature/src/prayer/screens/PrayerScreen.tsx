import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { palette } from '@spirit/prayer-feature/theme';
import PrayerRenderer from '../components/PrayerRenderer';
import MeasureProgressBar from '../components/MeasureProgressBar';
import ServiceMap from '../components/ServiceMap';
import { extractMajorSections } from '../utils/serviceMap';
import { getSectionsSignature } from '../utils/sections';
import useEvaluationDate from '../hooks/useEvaluationDate';
import { loadPrayer, type PrayerId } from '../utils/prayerLoader';
import type { PrayerBlock } from '../types/prayer';

type PrayerScreenProps = {
  prayerId?: PrayerId;
};

const PENDING_END_DEBOUNCE_MS = 100;

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
  statusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: palette.paper,
    alignItems: 'center',
  },
  statusText: {
    marginTop: 8,
    color: palette.mutedInk,
    textAlign: 'center',
  },
  errorText: {
    color: palette.accent,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const PrayerScreen: React.FC<PrayerScreenProps> = (props) => {
  let route: any;
  try {
    route = useRoute();
  } catch (_err) {
    route = undefined as any;
  }
  const resolvedPrayerId: PrayerId = (props.prayerId ?? route?.params?.prayerId ?? 'liturgy') as PrayerId;
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
    endTimerId: ReturnType<typeof setTimeout> | null;
  }>({
    active: false,
    endTimerId: null,
  });
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>(undefined);
  const [measuredCount, setMeasuredCount] = useState<number>(0);
  const prevSectionsSigRef = useRef<string | null>(null);
  const [data, setData] = useState<PrayerBlock[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    console.log(`EVENT: Prayer screen opened for '${resolvedPrayerId}'`);
  }, [resolvedPrayerId]);

  useEffect(() => {
    const ref = programmaticScrollRef.current;
    if (ref.endTimerId) {
      clearTimeout(ref.endTimerId);
      ref.endTimerId = null;
    }
    ref.active = false;
    sectionPositionsRef.current = {};
    lastScrollYRef.current = 0;
    contentHeightRef.current = 0;
    containerHeightRef.current = 0;
    setMeasuredCount(0);
    setActiveSectionId(undefined);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [resolvedPrayerId]);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setData(null);
    setLoadError(null);

    loadPrayer(resolvedPrayerId)
      .then((blocks) => {
        if (!isActive) return;
        setData(blocks);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isActive) return;
        const resolvedError = error instanceof Error ? error : new Error(String(error));
        setLoadError(resolvedError);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [resolvedPrayerId]);

  const resolvedData = data ?? ([] as PrayerBlock[]);

  const evaluationDate = useEvaluationDate();

  const sections = useMemo(
    () => extractMajorSections(resolvedData, evaluationDate),
    [resolvedData, evaluationDate],
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
    if (ref.endTimerId) {
      clearTimeout(ref.endTimerId);
      ref.endTimerId = null;
    }
    ref.active = false;
  }

  function beginProgrammaticScroll(targetY: number) {
    const ref = programmaticScrollRef.current;
    ref.active = true;
    if (ref.endTimerId) {
      clearTimeout(ref.endTimerId);
      ref.endTimerId = null;
    }
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
      if (ref.endTimerId) {
        clearTimeout(ref.endTimerId);
        ref.endTimerId = null;
      }
      ref.active = false;
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

  // Programmatic scrolls debounce their own completion; once the timer fires we settle on the final section.
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      lastScrollYRef.current = y;
      const ref = programmaticScrollRef.current;
      if (ref.active) {
        if (ref.endTimerId) {
          clearTimeout(ref.endTimerId);
        }
        ref.endTimerId = setTimeout(() => {
          const finalY = lastScrollYRef.current || 0;
          const id = computeActiveSectionIdForY(finalY);
          if (id) {
            setActiveSectionId(id);
          }
          endProgrammaticScroll();
        }, PENDING_END_DEBOUNCE_MS);
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
          isDisabled={!isPositionsReady || isLoading}
        />
        {isCalculating && (
          <MeasureProgressBar
            progress={calcProgress}
            label={`Рассчёт разделов: ${measuredCount}/${sectionsCount}`}
            style={{ paddingHorizontal: 20, paddingBottom: 8 }}
          />
        )}
      </View>
      {isLoading && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" accessibilityLabel="Загрузка молитвы" />
          <Text style={styles.statusText}>Загрузка молитвы...</Text>
        </View>
      )}
      {!isLoading && loadError && (
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>Не удалось загрузить молитву</Text>
          <Text style={styles.statusText}>{loadError.message}</Text>
        </View>
      )}
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
          if (programmaticScrollRef.current.active) {
            console.debug('[PrayerScreen] ignored momentum-end while programmatic scroll active');
            return;
          }
          const finalY = lastScrollYRef.current || 0;
          const id = computeActiveSectionIdForY(finalY);
          setActiveSectionId(id);
        }}
        scrollEventThrottle={16}
      >
        {!isLoading && !loadError ? (
          <PrayerRenderer
            blocks={resolvedData}
            onMajorSectionLayout={handleSectionLayout}
            sectionIdLookup={sectionIndexLookup}
            evaluationDate={evaluationDate}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrayerScreen;
