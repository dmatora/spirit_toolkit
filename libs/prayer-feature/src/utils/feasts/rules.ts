import { FeastRule } from './types';

export const MAJOR_FEAST_RULES: FeastRule[] = [
  { kind: 'fixed', key: 'circumcision', titleRu: 'Обрезание Господне', month: 1, day: 1, calendar: 'julian' },
  { kind: 'fixed', key: 'theophany', titleRu: 'Крещение Господне (Богоявление)', month: 1, day: 6, calendar: 'julian' },
  { kind: 'fixed', key: 'presentation', titleRu: 'Сретение Господне', month: 2, day: 2, calendar: 'julian' },
  { kind: 'fixed', key: 'annunciation', titleRu: 'Благовещение Пресвятой Богородицы', month: 3, day: 25, calendar: 'julian' },
  { kind: 'relativeToEaster', key: 'palm_sunday', titleRu: 'Вход Господень в Иерусалим', offsetDays: -7 },
  { kind: 'relativeToEaster', key: 'easter', titleRu: 'Пасха Христова', offsetDays: 0 },
  { kind: 'relativeToEaster', key: 'ascension', titleRu: 'Вознесение Господне', offsetDays: 39 },
  { kind: 'relativeToEaster', key: 'pentecost', titleRu: 'Пятидесятница (Троица)', offsetDays: 49 },
  { kind: 'fixed', key: 'peter_paul', titleRu: 'Святых первоверховных апостолов Петра и Павла', month: 6, day: 29, calendar: 'julian' },
  { kind: 'fixed', key: 'transfiguration', titleRu: 'Преображение Господне', month: 8, day: 6, calendar: 'julian' },
  { kind: 'fixed', key: 'dormition', titleRu: 'Успение Пресвятой Богородицы', month: 8, day: 15, calendar: 'julian' },
  { kind: 'fixed', key: 'beheading_john', titleRu: 'Усекновение главы Иоанна Предтечи', month: 8, day: 29, calendar: 'julian' },
  { kind: 'fixed', key: 'nativity_theotokos', titleRu: 'Рождество Пресвятой Богородицы', month: 9, day: 8, calendar: 'julian' },
  { kind: 'fixed', key: 'exaltation_cross', titleRu: 'Воздвижение Креста Господня', month: 9, day: 14, calendar: 'julian' },
  { kind: 'fixed', key: 'protection_theotokos', titleRu: 'Покров Пресвятой Богородицы', month: 10, day: 1, calendar: 'julian' },
  { kind: 'fixed', key: 'entry_theotokos', titleRu: 'Введение во храм Пресвятой Богородицы', month: 11, day: 21, calendar: 'julian' },
  { kind: 'fixed', key: 'nativity_christ', titleRu: 'Рождество Христово', month: 12, day: 25, calendar: 'julian' },
];
