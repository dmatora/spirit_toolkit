import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextStyle,
  LayoutChangeEvent,
  AccessibilityRole,
} from 'react-native';
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
  evaluationDate?: Date;
};

type TextualPrayerBlock = Extract<PrayerBlock, { type: 'heading' | 'paragraph' | 'instruction' }>;

type RenderOptions = {
  onLayout?: (event: LayoutChangeEvent) => void;
  accessibilityRole?: AccessibilityRole;
};

const renderTextualBlock = (
  block: TextualPrayerBlock,
  index: number,
  textStyle: TextStyle,
  options: RenderOptions = {},
): React.ReactNode => {
  const roleStyle = block.role ? ROLE_STYLES[block.role] : undefined;
  const { onLayout, accessibilityRole } = options;

  return (
    <View
      key={`b-${index}`}
      style={[
        styles.blockWrapper,
        roleStyle && styles.roleWrapper,
        roleStyle && {
          borderLeftColor: roleStyle.borderColor,
          backgroundColor: roleStyle.backgroundColor ?? palette.paper,
        },
      ]}
      onLayout={onLayout}
      accessibilityRole={accessibilityRole}
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

const PrayerRenderer = ({
  blocks,
  onMajorSectionLayout,
  sectionIdLookup,
  evaluationDate,
}: Props) => {
  let globalIndex = -1;
  let conditionalCounter = 0;
  const effectiveEvaluationDate = evaluationDate ?? new Date();

  const renderBlockRecursive = (block: PrayerBlock): React.ReactNode => {
    if (block.type === 'conditional') {
      if (!evaluateCondition(block, effectiveEvaluationDate)) {
        return null;
      }

      const conditionalKey = conditionalCounter;
      conditionalCounter += 1;

      return (
        <View key={`conditional-${conditionalKey}`} style={styles.conditionalBox}>
          {block.content.map((child) => renderBlockRecursive(child))}
        </View>
      );
    }

    globalIndex += 1;
    const index = globalIndex;
    const hasSection = Boolean(sectionIdLookup?.[index]);
    const isMajorHeading = block.type === 'heading' && block.is_major_section;

    const onLayout =
      block.is_major_section && hasSection
        ? (event: LayoutChangeEvent) => {
            onMajorSectionLayout?.(block, index, event.nativeEvent.layout.y);
          }
        : undefined;

    const renderOptions: RenderOptions = {
      onLayout,
      accessibilityRole: isMajorHeading ? 'header' : undefined,
    };

    switch (block.type) {
      case 'heading':
        return renderTextualBlock(block, index, styles.heading, renderOptions);
      case 'paragraph':
        return renderTextualBlock(block, index, styles.paragraph, renderOptions);
      case 'instruction':
        return renderTextualBlock(block, index, styles.instruction, renderOptions);
      default:
        return null;
    }
  };

  return <View style={styles.container}>{blocks.map((block) => renderBlockRecursive(block))}</View>;
};

export default PrayerRenderer;
