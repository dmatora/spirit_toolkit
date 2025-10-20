import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

type UseActiveSectionObserverArgs = {
  containerId?: string;
  sectionIds: string[];
  rootStrategy?: 'container' | 'viewport';
};

type UseActiveSectionObserverResult = {
  activeSectionId?: string;
  scrollToSection: (id: string) => void;
};

const noop = () => {};

const getStickyOffsetPx = (): number => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  return document.getElementById('prayer-topbar')?.getBoundingClientRect().height ?? 0;
};

export function useActiveSectionObserver({
  containerId,
  sectionIds,
  rootStrategy = 'container',
}: UseActiveSectionObserverArgs): UseActiveSectionObserverResult {
  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>(undefined);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const trackedElementsRef = useRef<Set<Element>>(new Set());

  const scrollToSection = useCallback(
    (id: string) => {
      if (
        !isWeb ||
        typeof document === 'undefined' ||
        typeof window === 'undefined'
      ) {
        return;
      }

      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      const sticky = getStickyOffsetPx();
      const breathingRoom = 9;

      if (rootStrategy === 'container' && containerId) {
        const container = document.getElementById(containerId);
        if (container) {
          const elementRect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const deltaTop = elementRect.top - containerRect.top;
          const targetTop = container.scrollTop + deltaTop - sticky - breathingRoom;
          container.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth',
          });
          return;
        }
      }

      const targetY =
        window.scrollY + element.getBoundingClientRect().top - sticky - breathingRoom;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth',
      });
    },
    [containerId, isWeb, rootStrategy],
  );

  useEffect(() => {
    if (
      !isWeb ||
      typeof document === 'undefined' ||
      typeof window === 'undefined'
    ) {
      return noop;
    }

    const useContainerRoot = rootStrategy === 'container';
    const container =
      useContainerRoot && containerId ? document.getElementById(containerId) : null;

    if (useContainerRoot && !container) {
      return noop;
    }

    const cleanupTrackedElements = () => {
      trackedElementsRef.current.forEach((el) => observerRef.current?.unobserve(el));
      trackedElementsRef.current.clear();
    };

    const disconnectObserver = () => {
      cleanupTrackedElements();
      observerRef.current?.disconnect();
      observerRef.current = null;
    };

    if (typeof window.IntersectionObserver === 'function') {
      const recreateObserver = () => {
        disconnectObserver();

        const sticky = getStickyOffsetPx();
        const observer = new IntersectionObserver(
          (entries) => {
            let candidate: IntersectionObserverEntry | undefined;
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                return;
              }
              if (!candidate) {
                candidate = entry;
                return;
              }
              if (entry.intersectionRatio > candidate.intersectionRatio) {
                candidate = entry;
                return;
              }
              if (
                entry.intersectionRatio === candidate.intersectionRatio &&
                entry.boundingClientRect.top < candidate.boundingClientRect.top
              ) {
                candidate = entry;
              }
            });

            const nextId = candidate?.target?.id;
            if (nextId) {
              setActiveSectionId((prev) => (prev === nextId ? prev : nextId));
            }
          },
          {
            root: useContainerRoot ? container : null,
            threshold: [0, 0.25, 0.5, 0.75, 1],
            rootMargin: `-${sticky}px 0px 0px 0px`,
          },
        );

        observerRef.current = observer;

        sectionIds.forEach((sectionId) => {
          const element = document.getElementById(sectionId);
          if (element) {
            observer.observe(element);
            trackedElementsRef.current.add(element);
          }
        });
      };

      recreateObserver();

      let resizeFrame: number | null = null;
      const handleResize = () => {
        if (resizeFrame !== null) {
          window.cancelAnimationFrame(resizeFrame);
        }
        resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = null;
          recreateObserver();
        });
      };

      window.addEventListener('resize', handleResize);

      return () => {
        if (resizeFrame !== null) {
          window.cancelAnimationFrame(resizeFrame);
        }
        window.removeEventListener('resize', handleResize);
        disconnectObserver();
      };
    }

    disconnectObserver();

    const selectBestVisibleSection = () => {
      let bestId: string | undefined;
      let bestRatio = 0;
      const sticky = getStickyOffsetPx();

      sectionIds.forEach((sectionId) => {
        const el = document.getElementById(sectionId);
        if (!el) {
          return;
        }

        const rect = el.getBoundingClientRect();
        const { top: boundsTop, bottom: boundsBottom } =
          useContainerRoot && container
            ? container.getBoundingClientRect()
            : { top: 0, bottom: window.innerHeight ?? 0 };
        const effectiveTopBound = boundsTop + sticky;
        const top = Math.max(rect.top, effectiveTopBound);
        const bottom = Math.min(rect.bottom, boundsBottom);
        const visible = Math.max(0, bottom - top);
        const ratio = rect.height > 0 ? visible / rect.height : 0;
        if (ratio <= 0) {
          return;
        }
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = sectionId;
        }
      });

      if (bestId) {
        setActiveSectionId((prev) => (prev === bestId ? prev : bestId));
      }
    };

    let rafId: number | null = null;
    const throttledHandler = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        selectBestVisibleSection();
      });
    };

    const cleanup = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', throttledHandler);
      window.removeEventListener('scroll', throttledHandler);
      if (useContainerRoot && container) {
        container.removeEventListener('scroll', throttledHandler);
      }
    };

    if (useContainerRoot && container) {
      container.addEventListener('scroll', throttledHandler, { passive: true });
    } else {
      window.addEventListener('scroll', throttledHandler, { passive: true });
    }
    window.addEventListener('resize', throttledHandler);
    throttledHandler();

    return cleanup;
  }, [containerId, isWeb, rootStrategy, sectionIds]);

  return useMemo(
    () => ({
      activeSectionId,
      scrollToSection: isWeb ? scrollToSection : noop,
    }),
    [activeSectionId, isWeb, scrollToSection],
  );
}
