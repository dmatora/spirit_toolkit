export function pluralizeDaysRu(n: number): 'день' | 'дня' | 'дней' {
  const value = Math.abs(n);
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'день';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'дня';
  }

  return 'дней';
}

export function pluralizeMinutesRu(
  n: number
): 'минута' | 'минуты' | 'минут' {
  const value = Math.abs(n);
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'минута';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'минуты';
  }

  return 'минут';
}

export function pluralizeHoursRu(n: number): 'час' | 'часа' | 'часов' {
  const value = Math.abs(n);
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return 'час';
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'часа';
  }

  return 'часов';
}
