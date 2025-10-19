import React from 'react';
import { View, Text, StyleSheet, TextStyle, LayoutChangeEvent } from 'react-native';
import { palette } from '@spirit/prayer-feature/theme';
import type { PrayerBlock, PrayerRole } from '../types/prayer';
import { evaluateCondition } from '../utils/conditions';

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: palette.paper },
  blockWrapper: { marginBottom: 12 },
  heading: { fontSize: 20, fontWeight: '700', color: palette.ink },
  paragraph: { fontSize: 16, color: palette.ink, lineHeight: 24 },
  instruction: { fontSize: 14, fontStyle: 'italic', color: palette.accent },
  conditionalBox: {
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
    backgroundColor: palette.chipBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  roleWrapper: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingLeft: 12,
    paddingVertical: 8,
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
    color: palette.mutedInk,
  },
  activeHighlight: {
    backgroundColor: palette.accentSoft,
    borderLeftColor: palette.accent,
  },
});

type RoleStyleConfig = {
  label: string;
  borderColor: string;
  labelColor: string;
  backgroundColor?: string;
};

const ROLE_STYLES: Record<PrayerRole, RoleStyleConfig> = {
  priest: { label: 'Священник', borderColor: palette.accent, labelColor: palette.accent, backgroundColor: palette.chipBg },
  deacon: { label: 'Диакон', borderColor: palette.mutedInk, labelColor: palette.mutedInk },
  choir: { label: 'Хор', borderColor: palette.accentSoft, labelColor: palette.accent, backgroundColor: palette.chipBg },
  people: { label: 'Народ', borderColor: palette.divider, labelColor: palette.mutedInk },
};

type Props = {
  blocks: PrayerBlock[];
  onMajorSectionLayout?: (block: PrayerBlock, index: number, y: number) => void;
  sectionIdLookup?: Record<number, string>;
  activeSectionId?: string;
};

type TextualPrayerBlock = Extract<PrayerBlock, { type: 'heading' | 'paragraph' | 'instruction' }>;

type RenderOptions = {
  onLayout?: (event: LayoutChangeEvent) => void;
  isActive?: boolean;
};

const renderTextualBlock = (
  block: TextualPrayerBlock,
  index: number,
  textStyle: TextStyle,
  keyPrefix: string,
  options: RenderOptions = {},
): React.ReactNode => {
  const roleStyle = block.role ? ROLE_STYLES[block.role] : undefined;
  const { onLayout, isActive } = options;

  return (
    <View
      key={`${keyPrefix}-${index}`}
      style={[
        styles.blockWrapper,
        roleStyle && styles.roleWrapper,
        roleStyle && {
          borderLeftColor: roleStyle.borderColor,
          backgroundColor: roleStyle.backgroundColor ?? palette.paper,
        },
        isActive && styles.activeHighlight,
      ]}
      onLayout={onLayout}
    >
      {roleStyle && (
        <Text
          style={[styles.roleLabel, { color: roleStyle.labelColor }]}
          accessibilityLabel={`Роль: ${roleStyle.label}`}
        >
          {roleStyle.label}
        </Text>
      )}
      <Text style={textStyle}>{block.content}</Text>
    </View>
  );
};

const PrayerRenderer = ({ blocks, onMajorSectionLayout, sectionIdLookup, activeSectionId }: Props) => {
  const renderBlock = (block: PrayerBlock, index: number): React.ReactNode => {
    const sectionId = sectionIdLookup?.[index];
    const isActive = Boolean(sectionId && sectionId === activeSectionId);

    switch (block.type) {
      case 'heading':
        return renderTextualBlock(
          block,
          index,
          styles.heading,
          'heading',
          {
            isActive,
            onLayout: block.is_major_section
              ? (event) => {
                  onMajorSectionLayout?.(block, index, event.nativeEvent.layout.y);
                }
              : undefined,
          },
        );
      case 'paragraph':
        return renderTextualBlock(
          block,
          index,
          styles.paragraph,
          'paragraph',
          {
            isActive,
            onLayout: block.is_major_section
              ? (event) => {
                  onMajorSectionLayout?.(block, index, event.nativeEvent.layout.y);
                }
              : undefined,
          },
        );
      case 'instruction':
        return renderTextualBlock(
          block,
          index,
          styles.instruction,
          'instruction',
          {
            isActive,
            onLayout: block.is_major_section
              ? (event) => {
                  onMajorSectionLayout?.(block, index, event.nativeEvent.layout.y);
                }
              : undefined,
          },
        );
      case 'conditional': {
        const shouldShow = evaluateCondition(block);
        if (!shouldShow) return null;
        return (
          <View key={`conditional-${index}`} style={styles.conditionalBox}>
            {block.content.map((child, i) => renderBlock(child, i))}
          </View>
        );
      }
      default:
        return null;
    }
  };

  return <View style={styles.container}>{blocks.map((b, i) => renderBlock(b, i))}</View>;
};

export default PrayerRenderer;
