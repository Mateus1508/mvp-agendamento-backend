import { DayOfWeek } from '@prisma/client';

export const BOOKING_TIMEZONE = 'America/Sao_Paulo';

const WEEKDAY_TO_DAY_OF_WEEK: Record<string, DayOfWeek> = {
  Monday: DayOfWeek.MONDAY,
  Tuesday: DayOfWeek.TUESDAY,
  Wednesday: DayOfWeek.WEDNESDAY,
  Thursday: DayOfWeek.THURSDAY,
  Friday: DayOfWeek.FRIDAY,
  Saturday: DayOfWeek.SATURDAY,
  Sunday: DayOfWeek.SUNDAY,
};

export function getDateStringInTimezone(
  date: Date,
  timeZone = BOOKING_TIMEZONE,
): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function getDayOfWeekFromDateString(dateStr: string): DayOfWeek {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_TIMEZONE,
    weekday: 'long',
  }).format(new Date(`${dateStr}T12:00:00-03:00`));

  return WEEKDAY_TO_DAY_OF_WEEK[weekday];
}

export function formatDateLabel(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BOOKING_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${dateStr}T12:00:00-03:00`));
}

export function getCurrentTimeString(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BOOKING_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function formatTimeInTimezone(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BOOKING_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function generateHourlySlots(
  startTime: string,
  endTime: string,
): string[] {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const endTotalMinutes = endHour * 60 + endMinute;

  const slots: string[] = [];
  let hour = startHour;
  let minute = startMinute;

  while (hour * 60 + minute < endTotalMinutes) {
    slots.push(
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    );
    hour += 1;
  }

  return slots;
}

export function getDayBounds(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00-03:00`),
    end: new Date(`${dateStr}T23:59:59.999-03:00`),
  };
}

export function isTimeAfterNow(dateStr: string, time: string): boolean {
  const today = getDateStringInTimezone(new Date());

  if (dateStr !== today) {
    return true;
  }

  const [slotHour, slotMinute] = time.split(':').map(Number);
  const [currentHour, currentMinute] = getCurrentTimeString()
    .split(':')
    .map(Number);

  return (
    slotHour > currentHour ||
    (slotHour === currentHour && slotMinute > currentMinute)
  );
}
