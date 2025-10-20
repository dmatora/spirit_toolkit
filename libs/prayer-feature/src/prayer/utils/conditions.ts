import { orthodoxEaster } from '../../utils/feasts';
import type { PrayerConditionalBlock } from '../types/prayer';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function evaluateCondition(
  block: PrayerConditionalBlock,
  now: Date = new Date(),
): boolean {
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
