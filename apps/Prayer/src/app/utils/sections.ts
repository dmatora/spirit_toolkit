import type { ServiceSection } from '../utils/serviceMap';

/**
 * Produces a stable signature for a sequence of sections using ordered ids.
 */
export const getSectionsSignature = (sections: ServiceSection[]): string => {
  return sections.map((section) => section.id).join('|');
};

/**
 * Determines equality strictly by composition, order, and identifiers.
 */
export const areSectionsStructurallyEqual = (
  a: ServiceSection[],
  b: ServiceSection[],
): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) {
      return false;
    }
  }

  return true;
};
