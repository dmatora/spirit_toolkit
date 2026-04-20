import type { PrayerBlock } from '../types/prayer';
import { evaluateCondition, type PrayerConditionContext } from './conditions';

export type ServiceSection = {
  id: string;
  title: string;
  index: number;
  timestamp_minutes?: number;
};

type HeadingSnapshot = {
  title: string;
  timestamp_minutes?: number;
};

type TraversalState = {
  globalIndex: number;
  lastHeading: HeadingSnapshot | null;
};

type TraverseCallbackArgs = {
  block: PrayerBlock;
  index: number;
  lastHeading: HeadingSnapshot | null;
};

type TraverseCallback = (args: TraverseCallbackArgs) => void;

const fallbackTitle = (count: number) => `Раздел ${count + 1}`;

const traverseBlocks = (
  blocks: PrayerBlock[],
  context: PrayerConditionContext,
  state: TraversalState,
  callback?: TraverseCallback,
) => {
  blocks.forEach((block) => {
    if (block.type === 'conditional') {
      if (evaluateCondition(block, context)) {
        traverseBlocks(block.content, context, state, callback);
      }
      return;
    }

    if (block.type === 'heading') {
      state.lastHeading = {
        title: block.content,
        timestamp_minutes: block.timestamp_minutes,
      };
    }

    const index = state.globalIndex;

    callback?.({
      block,
      index,
      lastHeading: state.lastHeading,
    });

    state.globalIndex += 1;
  });
};

export const extractMajorSections = (
  blocks: PrayerBlock[],
  context: PrayerConditionContext = new Date(),
): ServiceSection[] => {
  const sections: ServiceSection[] = [];
  const state: TraversalState = { globalIndex: 0, lastHeading: null };

  traverseBlocks(blocks, context, state, ({ block, index, lastHeading }) => {
    if (!block.is_major_section) {
      return;
    }

    const directTitle =
      block.type === 'heading' || block.type === 'paragraph' || block.type === 'instruction'
        ? block.content
        : undefined;
    const title = directTitle ?? lastHeading?.title ?? fallbackTitle(sections.length);
    const timestamp = block.timestamp_minutes ?? lastHeading?.timestamp_minutes;

    sections.push({
      id: `section-${index}`,
      title,
      index,
      ...(typeof timestamp === 'number' ? { timestamp_minutes: timestamp } : {}),
    });
  });

  return sections;
};

export type ServiceSectionRange = {
  id: string;
  startIndex: number;
  endIndexExclusive: number;
};

export const computeSectionRanges = (
  blocks: PrayerBlock[],
  sections: ServiceSection[],
  context: PrayerConditionContext = new Date(),
): ServiceSectionRange[] => {
  const state: TraversalState = { globalIndex: 0, lastHeading: null };
  traverseBlocks(blocks, context, state);

  const totalRenderedCount = state.globalIndex;

  if (sections.length === 0) {
    return [];
  }

  const sortedSections = [...sections].sort((a, b) => a.index - b.index);

  return sortedSections.map((section, idx) => {
    const nextSection = sortedSections[idx + 1];
    return {
      id: section.id,
      startIndex: section.index,
      endIndexExclusive: nextSection ? nextSection.index : totalRenderedCount,
    };
  });
};
