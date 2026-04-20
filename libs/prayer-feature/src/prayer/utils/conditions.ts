import { daysBetween } from '../../utils/date';
import {
  calculateLiturgicalPeriod,
  type LiturgicalPeriodInfo,
  type LiturgicalPeriodKey,
} from './liturgicalPeriods';
import type { PrayerConditionalBlock, PrayerConditionRule } from '../types/prayer';

export type PrayerConditionContext =
  | Date
  | {
      now?: Date;
      liturgicalPeriod?: LiturgicalPeriodInfo;
      periodKey?: LiturgicalPeriodKey;
      isManual?: boolean;
    };

type NormalizedPrayerConditionContext = {
  now: Date;
  liturgicalPeriod: LiturgicalPeriodInfo;
  isManual: boolean;
};

const isDate = (value: PrayerConditionContext | undefined): value is Date =>
  value instanceof Date;

export const normalizePrayerConditionContext = (
  context: PrayerConditionContext = new Date(),
): NormalizedPrayerConditionContext => {
  const now = isDate(context) ? context : context.now ?? new Date();
  const calculatedPeriod =
    (!isDate(context) ? context.liturgicalPeriod : undefined) ??
    calculateLiturgicalPeriod(now);
  const periodKey = !isDate(context) ? context.periodKey : undefined;

  if (periodKey && periodKey !== calculatedPeriod.key) {
    return {
      now,
      liturgicalPeriod: {
        ...calculatedPeriod,
        key: periodKey,
      },
      isManual: Boolean(!isDate(context) && context.isManual),
    };
  }

  return {
    now,
    liturgicalPeriod: calculatedPeriod,
    isManual: Boolean(!isDate(context) && context.isManual),
  };
};

const isPaschaPeriod = (
  context: NormalizedPrayerConditionContext,
): boolean => {
  const { liturgicalPeriod, now } = context;

  if (context.isManual) {
    return (
      liturgicalPeriod.key === 'bright_week' ||
      liturgicalPeriod.key === 'pascha_to_ascension'
    );
  }

  if (typeof liturgicalPeriod.daysSincePascha === 'number') {
    return (
      liturgicalPeriod.daysSincePascha >= 0 &&
      liturgicalPeriod.daysSincePascha <= 39
    );
  }

  if (!liturgicalPeriod.paschaDate) {
    return false;
  }

  const daysSincePascha = daysBetween(liturgicalPeriod.paschaDate, now);
  return daysSincePascha >= 0 && daysSincePascha <= 39;
};

const evaluateRule = (
  rule: PrayerConditionRule | undefined,
  context: NormalizedPrayerConditionContext,
): boolean | null => {
  const periodKey = context.liturgicalPeriod.key;

  switch (rule) {
    case 'ordinary':
      return periodKey === 'ordinary';
    case 'pascha_period':
      return isPaschaPeriod(context);
    case 'pascha_bright_week':
      return periodKey === 'bright_week';
    case 'pascha_to_ascension':
      return periodKey === 'pascha_to_ascension';
    case 'ascension_to_trinity':
      return periodKey === 'ascension_to_trinity';
    default:
      return null;
  }
};

export function evaluateCondition(
  block: PrayerConditionalBlock,
  context: PrayerConditionContext = new Date(),
): boolean {
  const normalizedContext = normalizePrayerConditionContext(context);
  const ruleResult = evaluateRule(block.condition?.rule, normalizedContext);

  if (ruleResult === null) {
    return false;
  }

  return block.condition?.negate ? !ruleResult : ruleResult;
}
