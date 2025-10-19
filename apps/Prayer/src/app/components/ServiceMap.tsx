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
    paddingHorizontal: 4,
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
  if (!sections.length) return null;

  return (
    <ScrollView
      horizontal
      style={[styles.container, style]}
      contentContainerStyle={styles.content}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
