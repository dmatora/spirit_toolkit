import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { palette } from '@spirit/prayer-feature/theme';
import type { ServiceSection } from '../utils/serviceMap';

type Props = {
  sections: ServiceSection[];
  activeSectionId?: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  isDisabled?: boolean;
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  content: {
    paddingVertical: 4,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.chipBg,
    borderWidth: 1,
    borderColor: palette.divider,
    marginRight: 8,
  },
  lastChip: {
    marginRight: 0,
  },
  chipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.mutedInk,
  },
  chipTextActive: {
    color: palette.paper,
  },
  timestamp: {
    fontSize: 11,
    color: palette.mutedInk,
    marginTop: 2,
  },
  timestampActive: {
    color: palette.paper,
  },
});

const ServiceMap = ({
  sections,
  activeSectionId,
  onSelect,
  style,
  isDisabled = false,
}: Props) => {
  const scrollRef = React.useRef<ScrollView | null>(null);
  const scrollDomIdRef = React.useRef<string>(
    `service-map-scroll-${Math.random().toString(36).slice(2)}`,
  );
  const chipPositionsRef = React.useRef<Record<string, { x: number; width: number }>>({});
  const containerWidthRef = React.useRef<number>(0);

  React.useEffect(() => {
    chipPositionsRef.current = {};
    containerWidthRef.current = 0;
  }, [sections]);

  const scrollActiveIntoView = React.useCallback(() => {
    if (!activeSectionId) return;
    const position = chipPositionsRef.current[activeSectionId];
    const containerWidth = containerWidthRef.current;

    if (position && containerWidth) {
      const targetX = Math.max(0, position.x + position.width / 2 - containerWidth / 2);
      if (scrollRef.current && typeof scrollRef.current.scrollTo === 'function') {
        try {
          scrollRef.current.scrollTo({ x: targetX, animated: true });
        } catch (err) {
          scrollRef.current.scrollTo({ x: targetX, animated: false } as any);
        }
      }
      if (typeof document !== 'undefined') {
        const scrollNode = document.getElementById(scrollDomIdRef.current);
        if (scrollNode) {
          scrollNode.scrollLeft = targetX;
        }
      }
    }
  }, [activeSectionId]);

  React.useEffect(() => {
    scrollActiveIntoView();
  }, [scrollActiveIntoView]);

  React.useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    let cancelled = false;
    let frame: number | null = null;
    let attempts = 0;
    const maxAttempts = 40;

    const measureLegacyLayout = () => {
      if (cancelled) {
        return;
      }
      attempts += 1;
      const scrollNode = document.getElementById(scrollDomIdRef.current);
      if (!scrollNode) {
        if (attempts < maxAttempts) {
          frame = window.requestAnimationFrame(measureLegacyLayout);
        }
        return;
      }

      const scrollRect = scrollNode.getBoundingClientRect();
      if (scrollRect.width && scrollRect.width !== containerWidthRef.current) {
        containerWidthRef.current = scrollRect.width;
      }

      let changed = false;
      sections.forEach((section) => {
        if (chipPositionsRef.current[section.id]) {
          return;
        }
        const chip: HTMLElement | null = scrollNode.querySelector(
          `[data-testid="service-map-chip-${section.id}"]`,
        );
        if (!chip) {
          return;
        }
        const chipRect = chip.getBoundingClientRect();
        chipPositionsRef.current[section.id] = {
          x: chipRect.left - scrollRect.left + scrollNode.scrollLeft,
          width: chipRect.width,
        };
        changed = true;
      });

      if (changed) {
        scrollActiveIntoView();
      }

      const hasMissing = sections.some((section) => !chipPositionsRef.current[section.id]);
      if (hasMissing && attempts < maxAttempts) {
        frame = window.requestAnimationFrame(measureLegacyLayout);
      }
    };

    frame = window.requestAnimationFrame(measureLegacyLayout);

    return () => {
      cancelled = true;
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [sections, scrollActiveIntoView]);

  if (!sections.length) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      nativeID={scrollDomIdRef.current}
      style={[styles.container, style]}
      contentContainerStyle={styles.content}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onLayout={(event) => {
        containerWidthRef.current = event.nativeEvent.layout.width;
        scrollActiveIntoView();
      }}
    >
      {sections.map((section, index) => {
        const isActive = section.id === activeSectionId;
        const baseChipStyle = [
          styles.chip,
          index === sections.length - 1 && styles.lastChip,
          isDisabled && styles.chipDisabled,
        ];

        return (
          <Pressable
            key={section.id}
            onPress={isDisabled ? undefined : () => onSelect(section.id)}
            disabled={isDisabled}
            testID={`service-map-chip-${section.id}`}
            onLayout={(event) => {
              chipPositionsRef.current[section.id] = {
                x: event.nativeEvent.layout.x,
                width: event.nativeEvent.layout.width,
              };
              if (section.id === activeSectionId) {
                scrollActiveIntoView();
              }
            }}
            style={({ pressed }) => [
              ...baseChipStyle,
              isActive && styles.chipActive,
              pressed && !isDisabled && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive, disabled: isDisabled }}
            accessibilityLabel={`Перейти к разделу ${section.title}`}
            accessibilityHint={
              isDisabled ? 'Позиции разделов загружаются' : undefined
            }
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]} numberOfLines={1}>
              {section.title}
            </Text>
            {typeof section.timestamp_minutes === 'number' && (
              <Text
                style={[styles.timestamp, isActive && styles.timestampActive]}
                numberOfLines={1}
              >
                {`${section.timestamp_minutes} мин`}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

export default ServiceMap;
