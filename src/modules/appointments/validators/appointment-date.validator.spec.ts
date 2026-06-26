import { BadRequestException } from '@nestjs/common';
import {
  parseAppointmentDate,
  validateAppointmentDate,
} from './appointment-date.validator';

describe('appointment-date.validator', () => {
  describe('validateAppointmentDate', () => {
    it('deve aceitar horários cheios entre 08:00 e 17:00', () => {
      expect(() =>
        validateAppointmentDate(new Date('2026-06-27T11:00:00.000Z')),
      ).not.toThrow();
      expect(() =>
        validateAppointmentDate(new Date('2026-06-27T20:00:00.000Z')),
      ).not.toThrow();
    });

    it('deve rejeitar horários com minutos diferentes de zero', () => {
      expect(() =>
        validateAppointmentDate(new Date('2026-06-27T11:30:00.000Z')),
      ).toThrow(
        new BadRequestException(
          'O horário deve ser em horas cheias (ex: 08:00, 09:00)',
        ),
      );
    });

    it('deve rejeitar horários antes das 08:00', () => {
      expect(() =>
        validateAppointmentDate(new Date('2026-06-27T10:00:00.000Z')),
      ).toThrow(
        new BadRequestException('O horário deve estar entre 08:00 e 17:00'),
      );
    });

    it('deve rejeitar horários depois das 17:00', () => {
      expect(() =>
        validateAppointmentDate(new Date('2026-06-27T21:00:00.000Z')),
      ).toThrow(
        new BadRequestException('O horário deve estar entre 08:00 e 17:00'),
      );
    });
  });

  describe('parseAppointmentDate', () => {
    it('deve retornar a data quando for válida', () => {
      const date = parseAppointmentDate('2026-06-27T14:00:00.000Z');

      expect(date).toEqual(new Date('2026-06-27T14:00:00.000Z'));
    });

    it('deve lançar BadRequestException para data inválida', () => {
      expect(() => parseAppointmentDate('data-invalida')).toThrow(
        new BadRequestException('Data inválida'),
      );
    });
  });
});
