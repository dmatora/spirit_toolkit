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
  const chipPositionsRef = React.useRef<Record<string, { x: number; width: number }>>({});
  const containerWidthRef = React.useRef<number>(0);

  React.useEffect(() => {
    chipPositionsRef.current = {};
  }, [sections]);

  const scrollActiveIntoView = React.useCallback(() => {
    if (!activeSectionId) return;
    const position = chipPositionsRef.current[activeSectionId];
    const containerWidth = containerWidthRef.current;

    if (position && containerWidth && scrollRef.current) {
      const targetX = Math.max(0, position.x + position.width / 2 - containerWidth / 2);
      scrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [activeSectionId]);

  React.useEffect(() => {
    scrollActiveIntoView();
  }, [scrollActiveIntoView]);

  if (!sections.length) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
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
