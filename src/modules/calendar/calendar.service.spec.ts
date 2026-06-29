import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from '../customers/customers.service';
import { CalendarService } from './calendar.service';
import { GoogleCalendarProvider } from './google-calendar.provider';

describe('CalendarService', () => {
  let service: CalendarService;

  const googleCalendarProvider = {
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    getEvent: jest.fn(),
    listEvents: jest.fn(),
  };

  const customersService = {
    findOne: jest.fn(),
  };

  const event = {
    id: 'event-1',
    summary: 'Consulta',
    start: '2026-06-30T11:00:00.000Z',
    end: '2026-06-30T12:00:00.000Z',
    customerId: 'customer-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: GoogleCalendarProvider, useValue: googleCalendarProvider },
        { provide: CustomersService, useValue: customersService },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('deve criar um evento para um cliente existente', async () => {
      customersService.findOne.mockResolvedValue({ id: 'customer-1' });
      googleCalendarProvider.createEvent.mockResolvedValue(event);

      const result = await service.createEvent({
        summary: 'Consulta',
        start: '2026-06-30T11:00:00.000Z',
        end: '2026-06-30T12:00:00.000Z',
        customerId: 'customer-1',
      });

      expect(customersService.findOne).toHaveBeenCalledWith('customer-1');
      expect(googleCalendarProvider.createEvent).toHaveBeenCalled();
      expect(result).toEqual(event);
    });

    it('deve lançar BadRequestException para intervalo inválido', async () => {
      customersService.findOne.mockResolvedValue({ id: 'customer-1' });

      await expect(
        service.createEvent({
          summary: 'Consulta',
          start: '2026-06-30T12:00:00.000Z',
          end: '2026-06-30T11:00:00.000Z',
          customerId: 'customer-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEvent', () => {
    it('deve atualizar um evento', async () => {
      googleCalendarProvider.updateEvent.mockResolvedValue({
        ...event,
        summary: 'Consulta atualizada',
      });

      const result = await service.updateEvent('event-1', {
        summary: 'Consulta atualizada',
      });

      expect(result.summary).toBe('Consulta atualizada');
    });
  });

  describe('deleteEvent', () => {
    it('deve remover um evento existente', async () => {
      googleCalendarProvider.getEvent.mockResolvedValue(event);
      googleCalendarProvider.deleteEvent.mockResolvedValue(undefined);

      const result = await service.deleteEvent('event-1');

      expect(googleCalendarProvider.deleteEvent).toHaveBeenCalledWith('event-1');
      expect(result).toEqual(event);
    });

    it('deve lançar NotFoundException quando evento não existir', async () => {
      googleCalendarProvider.getEvent.mockResolvedValue(null);

      await expect(service.deleteEvent('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listEvents', () => {
    it('deve listar eventos por cliente', async () => {
      customersService.findOne.mockResolvedValue({ id: 'customer-1' });
      googleCalendarProvider.listEvents.mockResolvedValue([event]);

      const result = await service.listEvents({ customerId: 'customer-1' });

      expect(customersService.findOne).toHaveBeenCalledWith('customer-1');
      expect(googleCalendarProvider.listEvents).toHaveBeenCalledWith({
        customerId: 'customer-1',
      });
      expect(result).toEqual([event]);
    });
  });
});
