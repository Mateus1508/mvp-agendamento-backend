import { DayOfWeek } from '@prisma/client';

export const ALL_DAYS_OF_WEEK: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'segunda-feira',
  [DayOfWeek.TUESDAY]: 'terça-feira',
  [DayOfWeek.WEDNESDAY]: 'quarta-feira',
  [DayOfWeek.THURSDAY]: 'quinta-feira',
  [DayOfWeek.FRIDAY]: 'sexta-feira',
  [DayOfWeek.SATURDAY]: 'sábado',
  [DayOfWeek.SUNDAY]: 'domingo',
};

export function formatDayOfWeek(day: DayOfWeek): string {
  return DAY_OF_WEEK_LABELS[day];
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function generateUniqueSlug(
  baseName: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = slugify(baseName) || 'empresa';
  let candidate = baseSlug;
  let suffix = 1;

  while (await exists(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  return endHour * 60 + endMinute > startHour * 60 + startMinute;
}
