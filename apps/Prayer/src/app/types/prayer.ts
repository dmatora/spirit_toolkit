export type PrayerHeadingBlock = { type: 'heading'; content: string };
export type PrayerParagraphBlock = { type: 'paragraph'; content: string };
export type PrayerInstructionBlock = { type: 'instruction'; content: string };
export type PrayerConditionRule = 'pascha_period' | string;
export type PrayerConditionalBlock = {
  type: 'conditional';
  condition: { rule: PrayerConditionRule };
  content: PrayerBlock[];
};
export type PrayerBlock =
  | PrayerHeadingBlock
  | PrayerParagraphBlock
  | PrayerInstructionBlock
  | PrayerConditionalBlock;
