import type { PrayerBlock } from '../types/prayer';

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

const fallbackTitle = (count: number) => `Раздел ${count + 1}`;

export const extractMajorSections = (blocks: PrayerBlock[]): ServiceSection[] => {
  const sections: ServiceSection[] = [];
  let lastHeading: HeadingSnapshot | null = null;

  blocks.forEach((block, index) => {
    if (block.type === 'heading') {
      lastHeading = { title: block.content, timestamp_minutes: block.timestamp_minutes };
    }

    if (block.is_major_section) {
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
    }
  });

  return sections;
};
