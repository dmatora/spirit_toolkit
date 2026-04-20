export type PrayerRole = 'priest' | 'deacon' | 'choir' | 'people';

export interface PrayerBlockMeta {
  role?: PrayerRole;
  timestamp_minutes?: number;
  is_major_section?: boolean;
}

export interface PrayerHeadingBlock extends PrayerBlockMeta {
  type: 'heading';
  content: string;
}

export interface PrayerParagraphBlock extends PrayerBlockMeta {
  type: 'paragraph';
  content: string;
}

export interface PrayerInstructionBlock extends PrayerBlockMeta {
  type: 'instruction';
  content: string;
}

export type PrayerConditionRule =
  | 'ordinary'
  | 'pascha_period'
  | 'pascha_bright_week'
  | 'pascha_to_ascension'
  | 'ascension_to_trinity'
  | string;

export interface PrayerConditionalBlock extends PrayerBlockMeta {
  type: 'conditional';
  condition: { rule: PrayerConditionRule; negate?: boolean };
  content: PrayerBlock[];
}

export type PrayerBlock =
  | PrayerHeadingBlock
  | PrayerParagraphBlock
  | PrayerInstructionBlock
  | PrayerConditionalBlock;
