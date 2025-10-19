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

export type PrayerConditionRule = 'pascha_period' | string;

export interface PrayerConditionalBlock extends PrayerBlockMeta {
  type: 'conditional';
  condition: { rule: PrayerConditionRule };
  content: PrayerBlock[];
}

export type PrayerBlock =
  | PrayerHeadingBlock
  | PrayerParagraphBlock
  | PrayerInstructionBlock
  | PrayerConditionalBlock;
