import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { palette } from '@spirit/prayer-feature/theme';
import MeasureProgressBar from '../components/MeasureProgressBar';
import PrayerActivityIndicator from '../components/PrayerActivityIndicator';
import PrayerRenderer from '../components/PrayerRenderer';
import ServiceMap from '../components/ServiceMap';
import useEvaluationDate from '../hooks/useEvaluationDate';
import type { PrayerBlock } from '../types/prayer';
import { loadPrayer, type PrayerId } from '../utils/prayerLoader';
import { extractMajorSections } from '../utils/serviceMap';
import { getSectionsSignature } from '../utils/sections';
import { useActiveSectionObserver } from '../../web/useActiveSectionObserver';
import { recordPrayerActivity } from '../services/prayerActivityState';

type Props = {
  prayerId?: PrayerId;
  scrollSource?: 'internal' | 'external';
};

const PRAYER_TOPBAR_NATIVE_ID = 'prayer-topbar';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  topBar: {
    backgroundColor: palette.paper,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
    ...(Platform.OS === 'web'
      ? ({
          position: 'sticky',
          top: 0,
          zIndex: 10,
        } as any)
      : null),
  },
  mapContainer: {
    paddingBottom: 8,
  },
  mapContainerCompact: {
    paddingBottom: 0,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
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
  },
});

const PrayerScreen: React.FC<Props> = ({ prayerId = 'liturgy', scrollSource = 'internal' }) => {
  const [blocks, setBlocks] = useState<PrayerBlock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>(undefined);
  const [measuredCount, setMeasuredCount] = useState<number>(0);

  const sectionPositionsRef = useRef<Record<string, number>>({});
  const prevSectionsSigRef = useRef<string | null>(null);

  const useExternalScroll = scrollSource === 'external';
  const shouldTrackPrayerActivity = prayerId !== 'liturgy' && prayerId !== 'vespers';

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    setBlocks([]);

    loadPrayer(prayerId)
      .then((loadedBlocks) => {
        if (cancelled) {
          return;
        }
        setBlocks(loadedBlocks);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        const resolvedError = err instanceof Error ? err : new Error(String(err));
        setError(resolvedError);
        console.warn('[PrayerScreen:web] failed to load prayer', resolvedError);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [prayerId]);

  const evaluationDate = useEvaluationDate();

  const sections = useMemo(
    () => extractMajorSections(blocks, evaluationDate),
    [blocks, evaluationDate],
  );

  const sectionsSig = useMemo(() => getSectionsSignature(sections), [sections]);

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);

  const sectionIndexLookup = useMemo(() => {
    const lookup: Record<number, string> = {};
    sections.forEach((section) => {
      lookup[section.index] = section.id;
    });
    return lookup;
  }, [sections]);

  const sectionsCount = sections.length;

  const recomputeMeasuredCount = useCallback(() => {
    const positions = sectionPositionsRef.current;
    let total = 0;
    sectionIds.forEach((id) => {
      if (typeof positions[id] === 'number') {
        total += 1;
      }
    });
    setMeasuredCount(total);
  }, [sectionIds]);

  useEffect(() => {
    const prevSig = prevSectionsSigRef.current;
    if (prevSig === sectionsSig) {
      return;
    }
    prevSectionsSigRef.current = sectionsSig;
    sectionPositionsRef.current = {};
    setMeasuredCount(0);
    setActiveSectionId(undefined);
  }, [sectionsSig]);

  const isCalculating = sectionsCount > 0 && measuredCount < sectionsCount;
  const calcProgress = sectionsCount > 0 ? measuredCount / sectionsCount : 0;
  const isPositionsReady = sectionsCount > 0 && measuredCount >= sectionsCount;

  const { activeSectionId: observerActiveId, scrollToSection } = useActiveSectionObserver(
    useExternalScroll
      ? {
          sectionIds,
          rootStrategy: 'viewport',
        }
      : {
          containerId: 'prayer-scroll-container',
          sectionIds,
          rootStrategy: 'container',
        },
  );

  useEffect(() => {
    if (observerActiveId) {
      setActiveSectionId((prev) => (prev === observerActiveId ? prev : observerActiveId));
      return;
    }
    if (!isPositionsReady || activeSectionId) {
      return;
    }
    if (sections.length > 0) {
      setActiveSectionId(sections[0].id);
    }
  }, [observerActiveId, isPositionsReady, sections, activeSectionId]);

  const handleSectionLayout = useCallback(
    (_block: PrayerBlock, index: number, y: number) => {
      const sectionId = sectionIndexLookup[index];
      if (!sectionId) {
        return;
      }
      const positions = sectionPositionsRef.current;
      if (typeof positions[sectionId] !== 'number') {
        positions[sectionId] = y;
        recomputeMeasuredCount();
      }
    },
    [sectionIndexLookup, recomputeMeasuredCount],
  );

  useEffect(() => {
    // Older Safari versions (e.g. iOS 12) do not support ResizeObserver, so react-native-web
    // never triggers onLayout. We fallback to a manual DOM measurement loop to unblock the
    // section map and measurement progress on those browsers.
    if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }
    if (!sectionsCount) {
      return;
    }
    if (measuredCount >= sectionsCount) {
      return;
    }

    let cancelled = false;
    let frame: number | null = null;
    let attempts = 0;
    const maxAttempts = 60;

    const measureMissing = () => {
      if (cancelled) {
        return;
      }
      attempts += 1;
      const positions = sectionPositionsRef.current;
      let changed = false;

      sections.forEach((section) => {
        if (typeof positions[section.id] === 'number') {
          return;
        }
        const element = document.getElementById(section.id);
        if (!element) {
          return;
        }

        let offset = 0;
        if (useExternalScroll) {
          const rect = element.getBoundingClientRect();
          offset = rect.top + window.scrollY;
        } else {
          const container = document.getElementById('prayer-scroll-container');
          const containerRect = container?.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const scrollTop = container?.scrollTop ?? 0;
          offset = elementRect.top - (containerRect?.top ?? 0) + scrollTop;
        }

        positions[section.id] = offset;
        changed = true;
      });

      if (changed) {
        recomputeMeasuredCount();
      }

      if (cancelled || measuredCount >= sectionsCount || attempts >= maxAttempts) {
        return;
      }
      frame = window.requestAnimationFrame(measureMissing);
    };

    frame = window.requestAnimationFrame(measureMissing);

    return () => {
      cancelled = true;
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [
    measuredCount,
    recomputeMeasuredCount,
    sections,
    sectionsCount,
    useExternalScroll,
  ]);

  const handleSelectSection = useCallback(
    (sectionId: string) => {
      setActiveSectionId(sectionId);
      scrollToSection(sectionId);
    },
    [scrollToSection],
  );

  const prayerContent =
    !isLoading && !error ? (
      <PrayerRenderer
        blocks={blocks}
        onMajorSectionLayout={handleSectionLayout}
        sectionIdLookup={sectionIndexLookup}
        evaluationDate={evaluationDate}
      />
    ) : null;

  const effectiveActiveSectionId = observerActiveId ?? activeSectionId;

  const handleTrackedScroll = useCallback(
    (_event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (shouldTrackPrayerActivity) {
        recordPrayerActivity(Date.now());
      }
    },
    [shouldTrackPrayerActivity],
  );

  const scrollableContent = useExternalScroll ? (
    <View nativeID="prayer-scroll-container" style={[styles.scrollWrapper, styles.scrollContent]}>
      {prayerContent}
    </View>
  ) : (
    <ScrollView
      nativeID="prayer-scroll-container"
      style={styles.scrollWrapper}
      contentContainerStyle={styles.scrollContent}
      onScroll={handleTrackedScroll}
      scrollEventThrottle={16}
    >
      {prayerContent}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View nativeID={PRAYER_TOPBAR_NATIVE_ID} style={styles.topBar}>
        <ServiceMap
          sections={sections}
          activeSectionId={effectiveActiveSectionId}
          onSelect={handleSelectSection}
          style={[
            styles.mapContainer,
            shouldTrackPrayerActivity ? styles.mapContainerCompact : null,
          ]}
          isDisabled={!isPositionsReady || isLoading}
        />
        {isCalculating && (
          <MeasureProgressBar
            progress={calcProgress}
            label={`Рассчёт разделов: ${measuredCount}/${sectionsCount}`}
            style={styles.progressContainer}
          />
        )}
        {shouldTrackPrayerActivity && <PrayerActivityIndicator />}
      </View>
      {isLoading && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" accessibilityLabel="Загрузка молитвы" />
          <Text style={styles.statusText}>Загрузка молитвы…</Text>
        </View>
      )}
      {!isLoading && error && (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, styles.errorText]}>Не удалось загрузить молитву</Text>
          <Text style={styles.statusText}>{error.message}</Text>
        </View>
      )}
      {scrollableContent}
    </View>
  );
};

export default PrayerScreen;
