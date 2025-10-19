import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { palette } from '@spirit/prayer-feature/theme';
import { orthodoxEaster } from '@spirit/prayer-feature/utils/feasts';
import type {
  PrayerBlock,
  PrayerConditionalBlock,
  PrayerRole,
} from '../types/prayer';

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

function startOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d: Date, days: number): Date { const copy = new Date(d); copy.setDate(copy.getDate() + days); return copy; }

function evaluateCondition(block: PrayerConditionalBlock, now: Date = new Date()): boolean {
  const rule = block.condition?.rule;
  if (rule === 'pascha_period') {
    const year = now.getFullYear();
    const pascha = startOfDay(orthodoxEaster(year));
    // Ascension is on the 40th day after Pascha, offset 39 from Easter day
    const ascension = startOfDay(addDays(pascha, 39));
    const today = startOfDay(now);
    return today >= pascha && today <= ascension;
  }
  return false;
}

type Props = { blocks: PrayerBlock[] };

type TextualPrayerBlock = Extract<PrayerBlock, { type: 'heading' | 'paragraph' | 'instruction' }>;

const renderTextualBlock = (
  block: TextualPrayerBlock,
  index: number,
  textStyle: TextStyle,
  keyPrefix: string,
): React.ReactNode => {
  const roleStyle = block.role ? ROLE_STYLES[block.role] : undefined;

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
      ]}
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

const PrayerRenderer = ({ blocks }: Props) => {
  const renderBlock = (block: PrayerBlock, index: number): React.ReactNode => {
    switch (block.type) {
      case 'heading':
        return renderTextualBlock(block, index, styles.heading, 'heading');
      case 'paragraph':
        return renderTextualBlock(block, index, styles.paragraph, 'paragraph');
      case 'instruction':
        return renderTextualBlock(block, index, styles.instruction, 'instruction');
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
