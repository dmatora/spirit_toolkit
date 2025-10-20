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
      if (!isWeb) {
        return;
      }
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }
    },
    [isWeb],
  );

  useEffect(() => {
    if (!isWeb) {
      return noop;
    }

    const useContainerRoot = rootStrategy === 'container';
    const container = useContainerRoot && containerId ? document.getElementById(containerId) : null;
    if (useContainerRoot && !container) {
      return noop;
    }

    const cleanupTrackedElements = () => {
      trackedElementsRef.current.forEach((el) => observerRef.current?.unobserve(el));
      trackedElementsRef.current.clear();
    };

    if (typeof window.IntersectionObserver === 'function') {
      cleanupTrackedElements();

      observerRef.current = new IntersectionObserver(
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

          if (candidate?.target?.id && candidate.target.id !== activeSectionId) {
            setActiveSectionId(candidate.target.id);
          }
        },
        {
          root: useContainerRoot ? container : null,
          threshold: [0, 0.25, 0.5, 0.75, 1],
          rootMargin: '-40% 0px -40% 0px',
        },
      );

      sectionIds.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
          observerRef.current?.observe(element);
          trackedElementsRef.current.add(element);
        }
      });

      return () => {
        observerRef.current?.disconnect();
        cleanupTrackedElements();
      };
    }

    const selectBestVisibleSection = () => {
      let bestId: string | undefined;
      let bestRatio = 0;

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
        const top = Math.max(rect.top, boundsTop);
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

      if (bestId && bestId !== activeSectionId) {
        setActiveSectionId(bestId);
      }
    };

    const throttledHandler = () => {
      window.requestAnimationFrame(selectBestVisibleSection);
    };

    const cleanup = () => {
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
  }, [activeSectionId, containerId, isWeb, rootStrategy, sectionIds]);

  return useMemo(
    () => ({
      activeSectionId,
      scrollToSection: isWeb ? scrollToSection : noop,
    }),
    [activeSectionId, isWeb, scrollToSection],
  );
}
