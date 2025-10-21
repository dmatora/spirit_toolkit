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
const BREATHING_ROOM = 9;

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

      if (rootStrategy === 'container' && containerId) {
        const container = document.getElementById(containerId);
        if (container) {
          const elementRect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const deltaTop = elementRect.top - containerRect.top;
          const targetTop = container.scrollTop + deltaTop - sticky - BREATHING_ROOM;
          container.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth',
          });
          return;
        }
      }

      const targetY =
        window.scrollY + element.getBoundingClientRect().top - sticky - BREATHING_ROOM;
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
    let rafId: number | null = null;
    let resizeFrame: number | null = null;

    const runUpdate = () => {
      const stickyOffset = getStickyOffsetPx();
      const rootTop =
        useContainerRoot && container ? container.getBoundingClientRect().top : 0;
      const activationBoundary = stickyOffset + BREATHING_ROOM;

      let bestBelowId: string | undefined;
      let bestBelowTop = -Infinity;
      let bestAboveId: string | undefined;
      let bestAboveTop = Infinity;

      sectionIds.forEach((sectionId) => {
        const el = document.getElementById(sectionId);
        if (!el) {
          return;
        }

        const elementTop = el.getBoundingClientRect().top - rootTop;

        if (elementTop <= activationBoundary) {
          if (elementTop > bestBelowTop) {
            bestBelowTop = elementTop;
            bestBelowId = sectionId;
          }
        } else if (elementTop < bestAboveTop) {
          bestAboveTop = elementTop;
          bestAboveId = sectionId;
        }
      });

      const nextId = bestBelowId ?? bestAboveId;
      if (nextId) {
        setActiveSectionId((prev) => (prev === nextId ? prev : nextId));
      } else {
        setActiveSectionId((prev) => (prev === undefined ? prev : undefined));
      }
    };

    const scheduleUpdate = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        runUpdate();
      });
    };

    const disconnectObserver = () => {
      cleanupTrackedElements();
      observerRef.current?.disconnect();
      observerRef.current = null;
    };

    const intersectionSupported = typeof window.IntersectionObserver === 'function';

    const recreateObserver = () => {
      if (!intersectionSupported) {
        cleanupTrackedElements();
        return;
      }

      disconnectObserver();

      const sticky = getStickyOffsetPx();
      const observer = new IntersectionObserver(
        () => {
          scheduleUpdate();
        },
        {
          root: useContainerRoot ? container : null,
          threshold: [0],
          rootMargin: `-${sticky + BREATHING_ROOM}px 0px 0px 0px`,
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
      scheduleUpdate();
    };

    const handleResize = () => {
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        recreateObserver();
        scheduleUpdate();
      });
    };

    recreateObserver();

    const scrollTarget = useContainerRoot && container ? container : window;
    scrollTarget.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', handleResize);
    scheduleUpdate();

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }
      scrollTarget.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', handleResize);
      disconnectObserver();
    };
  }, [containerId, isWeb, rootStrategy, sectionIds]);

  return useMemo(
    () => ({
      activeSectionId,
      scrollToSection: isWeb ? scrollToSection : noop,
    }),
    [activeSectionId, isWeb, scrollToSection],
  );
}
