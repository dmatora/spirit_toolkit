import React, { useMemo } from 'react';
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
import type { PrayerId } from '../utils/prayerLoader';
import { evaluateCondition } from '../utils/conditions';
import { useFontScale } from '../context/FontScaleContext';

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: palette.paper },
  blockWrapper: { marginBottom: 12 },
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
});

const BASE_TEXT_STYLES = {
  heading: { fontSize: 20, fontWeight: '700', color: palette.ink } satisfies TextStyle,
  paragraph: { fontSize: 16, color: palette.ink, lineHeight: 24 } satisfies TextStyle,
  instruction: { fontSize: 14, fontStyle: 'italic', color: palette.accent } satisfies TextStyle,
  roleLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
    color: palette.mutedInk,
  } satisfies TextStyle,
};

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
  prayerId?: PrayerId;
};

type TextualPrayerBlock = Extract<PrayerBlock, { type: 'heading' | 'paragraph' | 'instruction' }>;

type RenderOptions = {
  onLayout?: (event: LayoutChangeEvent) => void;
  accessibilityRole?: AccessibilityRole;
  nativeID?: string;
  shrinkLeadingDigits?: boolean;
};

const LEADING_DIGIT_PRAYER_IDS: PrayerId[] = ['morning_rule', 'evening_rule'];
const LEADING_DIGIT_SCALE = 0.5;
const LEADING_DIGIT_REGEX = /^(\s*)(\d+)([\s\S]*)/;
const BOLD_TAG_REGEX = /<b>(.*?)<\/b>/;

const renderRichText = (content: string, baseStyle: TextStyle): React.ReactNode => {
  if (!BOLD_TAG_REGEX.test(content)) {
    return null;
  }

  const parts = content.split(/<b>(.*?)<\/b>/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <Text key={index} style={[baseStyle, { fontWeight: '700' }]}>
          {part}
        </Text>
      );
    }
    return part;
  });
};

const renderLeadingDigitContent = (
  content: string,
  textStyle: TextStyle,
): React.ReactNode[] | null => {
  const match = content.match(LEADING_DIGIT_REGEX);
  if (!match) {
    return null;
  }

  const [, leadingWhitespace, digits, remainder] = match;
  const leadingDigitStyle: TextStyle = {};

  if (typeof textStyle.fontSize === 'number') {
    leadingDigitStyle.fontSize = textStyle.fontSize * LEADING_DIGIT_SCALE;
  }

  const children: React.ReactNode[] = [];

  if (leadingWhitespace) {
    children.push(leadingWhitespace);
  }

  children.push(
    <Text key="leading-number" style={[textStyle, leadingDigitStyle]}>
      {digits}
    </Text>,
  );

  if (remainder) {
    children.push(remainder);
  }

  return children;
};

const renderTextualBlock = (
  block: TextualPrayerBlock,
  index: number,
  textStyle: TextStyle,
  roleLabelStyle: TextStyle,
  options: RenderOptions = {},
): React.ReactNode => {
  const roleStyle = block.role ? ROLE_STYLES[block.role] : undefined;
  const { onLayout, accessibilityRole, nativeID } = options;

  let contentChildren: React.ReactNode = null;

  if (options.shrinkLeadingDigits && typeof block.content === 'string') {
    contentChildren = renderLeadingDigitContent(block.content, textStyle);
  }

  if (!contentChildren && typeof block.content === 'string') {
    contentChildren = renderRichText(block.content, textStyle);
  }

  return (
    <View
      key={`b-${index}`}
      nativeID={nativeID}
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
          style={[roleLabelStyle, { color: roleStyle.labelColor }]}
          accessibilityLabel={`Роль: ${roleStyle.label}`}
        >
          {roleStyle.label}
        </Text>
      )}
      <Text style={textStyle}>{contentChildren ?? block.content}</Text>
    </View>
  );
};

const PrayerRenderer = ({
  blocks,
  onMajorSectionLayout,
  sectionIdLookup,
  evaluationDate,
  prayerId,
}: Props) => {
  const { fontScale } = useFontScale();
  const scaledTextStyles = useMemo(() => {
    const scaleValue = (value?: number) =>
      typeof value === 'number' ? value * fontScale : value;
    const scaleTextStyle = (style: TextStyle): TextStyle => ({
      ...style,
      fontSize: scaleValue(style.fontSize),
      lineHeight: scaleValue(style.lineHeight),
    });

    return {
      heading: scaleTextStyle(BASE_TEXT_STYLES.heading),
      paragraph: scaleTextStyle(BASE_TEXT_STYLES.paragraph),
      instruction: scaleTextStyle(BASE_TEXT_STYLES.instruction),
      roleLabel: scaleTextStyle(BASE_TEXT_STYLES.roleLabel),
    };
  }, [fontScale]);

  let globalIndex = -1;
  let conditionalCounter = 0;
  const effectiveEvaluationDate = evaluationDate ?? new Date();

  const shouldShrinkLeadingDigits = prayerId
    ? LEADING_DIGIT_PRAYER_IDS.includes(prayerId)
    : false;

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
    if (hasSection && block.is_major_section) {
      renderOptions.nativeID = sectionIdLookup?.[index];
    }
    renderOptions.shrinkLeadingDigits =
      shouldShrinkLeadingDigits && typeof block.content === 'string'
        ? LEADING_DIGIT_REGEX.test(block.content)
        : false;

    switch (block.type) {
      case 'heading':
        return renderTextualBlock(
          block,
          index,
          scaledTextStyles.heading,
          scaledTextStyles.roleLabel,
          renderOptions,
        );
      case 'paragraph':
        return renderTextualBlock(
          block,
          index,
          scaledTextStyles.paragraph,
          scaledTextStyles.roleLabel,
          renderOptions,
        );
      case 'instruction':
        return renderTextualBlock(
          block,
          index,
          scaledTextStyles.instruction,
          scaledTextStyles.roleLabel,
          renderOptions,
        );
      default:
        return null;
    }
  };

  return <View style={styles.container}>{blocks.map((block) => renderBlockRecursive(block))}</View>;
};

export default PrayerRenderer;
