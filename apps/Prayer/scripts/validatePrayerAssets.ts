import { promises as fs } from 'fs';
import * as path from 'path';
import type { PrayerBlock, PrayerConditionalBlock } from '../src/app/types/prayer';
import { evaluateCondition } from '../src/app/utils/conditions';
import {
  computeSectionRanges,
  extractMajorSections,
} from '../src/app/utils/serviceMap';

const ASSETS_DIR = path.resolve(__dirname, '../src/assets/prayers');
const ALLOWED_ROLES = new Set<PrayerBlock['role']>(['priest', 'deacon', 'choir', 'people']);

type ValidationDate = {
  label: string;
  date: Date;
};

const VALIDATION_DATES: ValidationDate[] = [
  { label: 'ordinary', date: new Date('2024-03-01T12:00:00Z') },
  { label: 'pascha_period', date: new Date('2024-05-05T12:00:00Z') },
];

type ValidationResult = {
  blocks: PrayerBlock[];
  errors: string[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const assertRole = (role: unknown): role is PrayerBlock['role'] =>
  typeof role === 'string' && ALLOWED_ROLES.has(role as PrayerBlock['role']);

const assertTimestamp = (timestamp: unknown): timestamp is number =>
  typeof timestamp === 'number' && Number.isFinite(timestamp);

const ensureConditionalBlock = (
  value: Record<string, unknown>,
  ctx: string,
  errors: string[],
): PrayerConditionalBlock | null => {
  if (!isObject(value.condition)) {
    errors.push(`${ctx}: conditional block missing condition object`);
    return null;
  }

  const rule = (value.condition as Record<string, unknown>).rule;
  if (rule !== 'pascha_period') {
    errors.push(`${ctx}: unsupported condition rule "${String(rule)}"`);
    return null;
  }

  if (!Array.isArray(value.content)) {
    errors.push(`${ctx}: conditional block requires "content" array`);
    return null;
  }

  const nested: PrayerBlock[] = [];
  value.content.forEach((child, index) => {
    const result = validateBlock(child, `${ctx}.content[${index}]`, errors);
    if (result) {
      nested.push(result);
    }
  });

  return {
    type: 'conditional',
    condition: { rule: 'pascha_period' },
    content: nested,
    role: assertRole(value.role) ? value.role : undefined,
    timestamp_minutes: assertTimestamp(value.timestamp_minutes)
      ? value.timestamp_minutes
      : undefined,
    is_major_section:
      typeof value.is_major_section === 'boolean' ? value.is_major_section : undefined,
  };
};

const validateBlock = (value: unknown, ctx: string, errors: string[]): PrayerBlock | null => {
  if (!isObject(value)) {
    errors.push(`${ctx}: expected object`);
    return null;
  }

  const { type } = value;

  if (type !== 'heading' && type !== 'paragraph' && type !== 'instruction' && type !== 'conditional') {
    errors.push(`${ctx}: unsupported block type "${String(type)}"`);
    return null;
  }

  if (type === 'conditional') {
    return ensureConditionalBlock(value, ctx, errors);
  }

  if (typeof value.content !== 'string' || !value.content.trim()) {
    errors.push(`${ctx}: "content" must be a non-empty string`);
  }

  if (value.role !== undefined && !assertRole(value.role)) {
    errors.push(`${ctx}: invalid role "${String(value.role)}"`);
  }

  if (
    value.timestamp_minutes !== undefined &&
    !assertTimestamp(value.timestamp_minutes)
  ) {
    errors.push(`${ctx}: "timestamp_minutes" must be a finite number when provided`);
  }

  const baseBlock = {
    type,
    content: typeof value.content === 'string' ? value.content : '',
    role: assertRole(value.role) ? value.role : undefined,
    timestamp_minutes: assertTimestamp(value.timestamp_minutes)
      ? value.timestamp_minutes
      : undefined,
    is_major_section:
      typeof value.is_major_section === 'boolean' ? value.is_major_section : undefined,
  } as PrayerBlock;

  return baseBlock;
};

const flattenBlocks = (blocks: PrayerBlock[], now: Date, rendered: PrayerBlock[]): void => {
  blocks.forEach((block) => {
    if (block.type === 'conditional') {
      if (evaluateCondition(block, now)) {
        flattenBlocks(block.content, now, rendered);
      }
      return;
    }

    rendered.push(block);
  });
};

const validateFile = (filePath: string, blocks: PrayerBlock[]): string[] => {
  const errors: string[] = [];

  VALIDATION_DATES.forEach(({ label, date }) => {
    const sections = extractMajorSections(blocks, date);
    if (!sections.length) {
      errors.push(`${filePath}: (${label}) extractMajorSections produced no sections`);
      return;
    }

    for (let i = 1; i < sections.length; i += 1) {
      if (sections[i].index <= sections[i - 1].index) {
        errors.push(
          `${filePath}: (${label}) section index ${sections[i].index} is not greater than previous ${sections[i - 1].index}`,
        );
      }
    }

    const rendered: PrayerBlock[] = [];
    flattenBlocks(blocks, date, rendered);

    sections.forEach((section) => {
      if (section.index < 0 || section.index >= rendered.length) {
        errors.push(
          `${filePath}: (${label}) section ${section.id} points to out-of-range index ${section.index}`,
        );
        return;
      }

      const target = rendered[section.index];
      if (!target.is_major_section) {
        errors.push(
          `${filePath}: (${label}) section ${section.id} index ${section.index} does not land on a block flagged as major`,
        );
      }
    });

    const ranges = computeSectionRanges(blocks, sections, date);
    if (!ranges.length) {
      errors.push(`${filePath}: (${label}) computeSectionRanges returned no ranges`);
      return;
    }

    const totalRendered = rendered.length;
    ranges.forEach((range, idx) => {
      if (range.startIndex !== sections[idx].index) {
        errors.push(
          `${filePath}: (${label}) range ${range.id} startIndex ${range.startIndex} mismatches section index ${sections[idx].index}`,
        );
      }
      if (range.startIndex >= range.endIndexExclusive) {
        errors.push(
          `${filePath}: (${label}) range ${range.id} has non-positive length (${range.startIndex}..${range.endIndexExclusive})`,
        );
      }
      if (range.endIndexExclusive > totalRendered) {
        errors.push(
          `${filePath}: (${label}) range ${range.id} exceeds rendered block count (${range.endIndexExclusive} > ${totalRendered})`,
        );
      }
      const next = ranges[idx + 1];
      if (next && range.endIndexExclusive !== next.startIndex) {
        errors.push(
          `${filePath}: (${label}) range ${range.id} end ${range.endIndexExclusive} must align with next start ${next.startIndex}`,
        );
      }
      if (!next && range.endIndexExclusive !== totalRendered) {
        errors.push(
          `${filePath}: (${label}) final range ${range.id} should end at rendered count ${totalRendered}`,
        );
      }
    });
  });

  return errors;
};

const loadAndValidate = async (filePath: string): Promise<ValidationResult> => {
  const errors: string[] = [];
  const raw = await fs.readFile(filePath, 'utf8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    errors.push(`${filePath}: failed to parse JSON (${(error as Error).message})`);
    return { blocks: [], errors };
  }

  if (!Array.isArray(parsed)) {
    errors.push(`${filePath}: top-level structure must be an array`);
    return { blocks: [], errors };
  }

  const blocks: PrayerBlock[] = [];
  parsed.forEach((value, index) => {
    const result = validateBlock(value, `${filePath}[${index}]`, errors);
    if (result) {
      blocks.push(result);
    }
  });

  if (!errors.length) {
    errors.push(...validateFile(filePath, blocks));
  }

  return { blocks, errors };
};

const main = async () => {
  const entries = await fs.readdir(ASSETS_DIR);
  const jsonFiles = entries.filter((file) => file.endsWith('.json'));

  let hasErrors = false;

  for (const file of jsonFiles) {
    const filePath = path.join(ASSETS_DIR, file);
    const { errors } = await loadAndValidate(filePath);
    if (errors.length) {
      hasErrors = true;
      errors.forEach((err) => console.error(err));
    }
  }

  if (hasErrors) {
    console.error('Prayer asset validation failed.');
    process.exitCode = 1;
    return;
  }

  console.log('Prayer assets validated successfully.');
};

main().catch((error) => {
  console.error('Unexpected error during prayer asset validation:', error);
  process.exitCode = 1;
});
