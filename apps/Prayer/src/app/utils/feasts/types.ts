export type FeastKey =
  | 'circumcision'
  | 'theophany'
  | 'presentation'
  | 'annunciation'
  | 'palm_sunday'
  | 'easter'
  | 'ascension'
  | 'pentecost'
  | 'peter_paul'
  | 'transfiguration'
  | 'dormition'
  | 'beheading_john'
  | 'nativity_theotokos'
  | 'exaltation_cross'
  | 'protection_theotokos'
  | 'entry_theotokos'
  | 'nativity_christ';

export interface Feast {
  key: FeastKey;
  titleRu: string;
  date: Date;
}

export interface FeastRuleFixed {
  kind: 'fixed';
  key: FeastKey;
  titleRu: string;
  month: number;
  day: number;
  calendar: 'julian' | 'gregorian';
}

export interface FeastRuleRelative {
  kind: 'relativeToEaster';
  key: FeastKey;
  titleRu: string;
  offsetDays: number;
}

export type FeastRule = FeastRuleFixed | FeastRuleRelative;
