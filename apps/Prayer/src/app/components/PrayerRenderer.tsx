import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '@spirit/prayer-feature/theme';
import { orthodoxEaster } from '@spirit/prayer-feature/utils/feasts';
import type { PrayerBlock, PrayerConditionalBlock } from '../types/prayer';

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: palette.paper },
  heading: { fontSize: 20, fontWeight: '700', color: palette.ink, marginBottom: 12 },
  paragraph: { fontSize: 16, color: palette.ink, marginBottom: 12, lineHeight: 24 },
  instruction: { fontSize: 14, fontStyle: 'italic', color: palette.accent, marginBottom: 12 },
  conditionalBox: {
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
    backgroundColor: palette.chipBg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
});

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

const PrayerRenderer = ({ blocks }: Props) => {
  const renderBlock = (block: PrayerBlock, index: number): React.ReactNode => {
    switch (block.type) {
      case 'heading':
        return (
          <Text key={`heading-${index}`} style={styles.heading}>
            {block.content}
          </Text>
        );
      case 'paragraph':
        return (
          <Text key={`paragraph-${index}`} style={styles.paragraph}>
            {block.content}
          </Text>
        );
      case 'instruction':
        return (
          <Text key={`instruction-${index}`} style={styles.instruction}>
            {block.content}
          </Text>
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
