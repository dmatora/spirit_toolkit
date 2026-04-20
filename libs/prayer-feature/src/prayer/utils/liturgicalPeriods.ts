import { daysBetween, localDateFromUTCDate, startOfDayLocal } from '../../utils/date';
import { orthodoxEaster } from '../../utils/feasts';
import { pluralizeDaysRu } from '../../utils/plural';

export const LITURGICAL_PERIOD_KEYS = [
  'ordinary',
  'bright_week',
  'pascha_to_ascension',
  'ascension_to_trinity',
] as const;

export type LiturgicalPeriodKey = (typeof LITURGICAL_PERIOD_KEYS)[number];

export type LiturgicalPeriodInfo = {
  key: LiturgicalPeriodKey;
  title: string;
  shortTitle: string;
  description: string;
  paschaDate?: Date;
  startsAt?: Date;
  endsAt?: Date;
  daysSincePascha?: number;
  paschaDay?: number;
  periodDay?: number;
  daysUntilEnd?: number;
  nextBoundaryTitle?: string;
  daysUntilBoundary?: number;
  isFallback?: boolean;
};

type PeriodMeta = Pick<LiturgicalPeriodInfo, 'title' | 'shortTitle' | 'description'>;

const PERIOD_META: Record<LiturgicalPeriodKey, PeriodMeta> = {
  ordinary: {
    title: 'Обычный период',
    shortTitle: 'Обычный',
    description: 'Молитвенные правила читаются без пасхальных изменений.',
  },
  bright_week: {
    title: 'Светлая седмица',
    shortTitle: 'Светлая седмица',
    description: 'Утреннее и вечернее правило заменяются Пасхальными часами.',
  },
  pascha_to_ascension: {
    title: 'От Пасхи до Вознесения',
    shortTitle: 'Пасха - Вознесение',
    description: 'Начальные молитвы и богородичный текст меняются по пасхальному уставу.',
  },
  ascension_to_trinity: {
    title: 'От Вознесения до Троицы',
    shortTitle: 'Вознесение - Троица',
    description: 'Молитва Святому Духу опускается до дня Святой Троицы.',
  },
};

const PERIOD_BOUNDS: Record<
  Exclude<LiturgicalPeriodKey, 'ordinary'>,
  { startOffset: number; endOffset: number }
> = {
  bright_week: { startOffset: 0, endOffset: 6 },
  pascha_to_ascension: { startOffset: 7, endOffset: 38 },
  ascension_to_trinity: { startOffset: 39, endOffset: 48 },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const addDays = (date: Date, days: number): Date =>
  new Date(startOfDayLocal(date).getTime() + days * MS_PER_DAY);

const isValidDate = (date: Date): boolean =>
  date instanceof Date && Number.isFinite(date.getTime());

export const isLiturgicalPeriodKey = (value: unknown): value is LiturgicalPeriodKey =>
  typeof value === 'string' &&
  (LITURGICAL_PERIOD_KEYS as readonly string[]).includes(value);

export const getLiturgicalPeriodMeta = (key: LiturgicalPeriodKey): PeriodMeta =>
  PERIOD_META[key] ?? PERIOD_META.ordinary;

export const createOrdinaryLiturgicalPeriod = (
  now: Date = new Date(),
  isFallback = false,
): LiturgicalPeriodInfo => {
  const today = isValidDate(now) ? startOfDayLocal(now) : startOfDayLocal(new Date());

  return {
    key: 'ordinary',
    ...PERIOD_META.ordinary,
    startsAt: today,
    isFallback,
  };
};

const getPaschaDate = (year: number): Date =>
  startOfDayLocal(localDateFromUTCDate(orthodoxEaster(year)));

const buildPeriodInfo = (
  key: LiturgicalPeriodKey,
  today: Date,
  paschaDate: Date,
): LiturgicalPeriodInfo => {
  if (key === 'ordinary') {
    return {
      ...createOrdinaryLiturgicalPeriod(today),
      paschaDate,
      daysSincePascha: daysBetween(paschaDate, today),
    };
  }

  const bounds = PERIOD_BOUNDS[key];
  const startsAt = addDays(paschaDate, bounds.startOffset);
  const endsAt = addDays(paschaDate, bounds.endOffset);
  const daysSincePascha = daysBetween(paschaDate, today);
  const daysUntilEnd = daysBetween(today, endsAt);
  const isWithinBounds = today >= startsAt && today <= endsAt;
  const nextBoundary =
    key === 'pascha_to_ascension'
      ? { title: 'Вознесения', date: addDays(paschaDate, 39) }
      : key === 'ascension_to_trinity'
        ? { title: 'Троицы', date: addDays(paschaDate, 49) }
        : undefined;
  const daysUntilBoundary = nextBoundary
    ? daysBetween(today, nextBoundary.date)
    : undefined;

  return {
    key,
    ...PERIOD_META[key],
    paschaDate,
    startsAt,
    endsAt,
    daysSincePascha,
    paschaDay: daysSincePascha + 1,
    periodDay: isWithinBounds ? daysBetween(startsAt, today) + 1 : undefined,
    daysUntilEnd: daysUntilEnd >= 0 ? daysUntilEnd : undefined,
    nextBoundaryTitle: nextBoundary?.title,
    daysUntilBoundary:
      typeof daysUntilBoundary === 'number' && daysUntilBoundary >= 0
        ? daysUntilBoundary
        : undefined,
  };
};

export const getLiturgicalPeriodInfoForKey = (
  key: LiturgicalPeriodKey,
  now: Date = new Date(),
): LiturgicalPeriodInfo => {
  try {
    const today = startOfDayLocal(isValidDate(now) ? now : new Date());
    const paschaDate = getPaschaDate(today.getFullYear());
    return buildPeriodInfo(key, today, paschaDate);
  } catch (_error) {
    return createOrdinaryLiturgicalPeriod(now, true);
  }
};

export const calculateLiturgicalPeriod = (now: Date = new Date()): LiturgicalPeriodInfo => {
  try {
    if (!isValidDate(now)) {
      return createOrdinaryLiturgicalPeriod(new Date(), true);
    }

    const today = startOfDayLocal(now);
    const paschaDate = getPaschaDate(today.getFullYear());
    const daysSincePascha = daysBetween(paschaDate, today);

    if (daysSincePascha >= 0 && daysSincePascha <= 6) {
      return buildPeriodInfo('bright_week', today, paschaDate);
    }

    if (daysSincePascha >= 7 && daysSincePascha <= 38) {
      return buildPeriodInfo('pascha_to_ascension', today, paschaDate);
    }

    if (daysSincePascha >= 39 && daysSincePascha <= 48) {
      return buildPeriodInfo('ascension_to_trinity', today, paschaDate);
    }

    return buildPeriodInfo('ordinary', today, paschaDate);
  } catch (_error) {
    return createOrdinaryLiturgicalPeriod(now, true);
  }
};

export const formatLiturgicalPeriodStatus = (
  period: LiturgicalPeriodInfo,
): string => {
  if (period.key === 'ordinary') {
    return period.title;
  }

  const parts: string[] = [];

  if (typeof period.paschaDay === 'number' && period.paschaDay > 0) {
    parts.push(`${period.paschaDay}-й день со дня Пасхи`);
  }

  if (
    period.nextBoundaryTitle &&
    typeof period.daysUntilBoundary === 'number'
  ) {
    if (period.daysUntilBoundary === 0) {
      parts.push(`${period.nextBoundaryTitle} сегодня`);
    } else {
      parts.push(
        `до ${period.nextBoundaryTitle} ${period.daysUntilBoundary} ${pluralizeDaysRu(period.daysUntilBoundary)}`,
      );
    }
  } else if (typeof period.daysUntilEnd === 'number') {
    if (period.daysUntilEnd === 0) {
      parts.push('заканчивается сегодня');
    } else {
      parts.push(
        `до окончания ${period.daysUntilEnd} ${pluralizeDaysRu(period.daysUntilEnd)}`,
      );
    }
  }

  return parts.length > 0 ? parts.join(', ') : period.title;
};
