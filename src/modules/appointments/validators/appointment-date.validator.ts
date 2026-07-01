import { BadRequestException } from '@nestjs/common';

export const APPOINTMENT_TIMEZONE = 'America/Sao_Paulo';
export const MIN_APPOINTMENT_HOUR = 8;
export const MAX_APPOINTMENT_HOUR = 17;

type DateParts = {
  hour: number;
  minute: number;
  second: number;
};

function getDatePartsInTimezone(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN);

  return {
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function validateAppointmentDate(date: Date): void {
  const { hour, minute, second } = getDatePartsInTimezone(
    date,
    APPOINTMENT_TIMEZONE,
  );

  if (minute !== 0 || second !== 0 || date.getMilliseconds() !== 0) {
    throw new BadRequestException(
      'O horário deve ser em horas cheias (ex: 08:00, 09:00)',
    );
  }

  if (hour < MIN_APPOINTMENT_HOUR || hour > MAX_APPOINTMENT_HOUR) {
    throw new BadRequestException('O horário deve estar entre 08:00 e 17:00');
  }
}

export function parseAppointmentDate(dateInput: string): Date {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Data inválida');
  }

  validateAppointmentDate(date);
  return date;
}

export function buildAppointmentDateFromParts(
  date: string,
  time: string,
): Date {
  return parseAppointmentDate(`${date}T${time}:00-03:00`);
}
