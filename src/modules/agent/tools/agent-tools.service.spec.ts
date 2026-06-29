import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgentToolsService } from './agent-tools.service';
import { AppointmentsTools } from './appointments.tools';
import { CalendarTools } from './calendar.tools';
import { CustomersTools } from './customers.tools';

describe('AgentToolsService', () => {
  let service: AgentToolsService;

  const customersTools = {
    execute: jest.fn(),
  };

  const appointmentsTools = {
    execute: jest.fn(),
  };

  const calendarTools = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentToolsService,
        { provide: CustomersTools, useValue: customersTools },
        { provide: AppointmentsTools, useValue: appointmentsTools },
        { provide: CalendarTools, useValue: calendarTools },
      ],
    }).compile();

    service = module.get<AgentToolsService>(AgentToolsService);
    jest.clearAllMocks();
  });

  it('deve retornar as definições de customers, appointments e calendar', () => {
    const definitions = service.getDefinitions();
    const toolNames = definitions.map((definition) => definition.function.name);

    expect(toolNames).toEqual(
      expect.arrayContaining([
        'list_customers',
        'list_appointments',
        'list_calendar_events',
      ]),
    );
  });

  it('deve delegar execução para CustomersTools', async () => {
    customersTools.execute.mockResolvedValue([{ id: '1' }]);

    const result = await service.execute('list_customers', {});

    expect(customersTools.execute).toHaveBeenCalledWith('list_customers', {});
    expect(result).toEqual([{ id: '1' }]);
  });

  it('deve delegar execução para AppointmentsTools', async () => {
    appointmentsTools.execute.mockResolvedValue([{ id: '1' }]);

    const result = await service.execute('list_appointments', {});

    expect(appointmentsTools.execute).toHaveBeenCalledWith(
      'list_appointments',
      {},
    );
    expect(result).toEqual([{ id: '1' }]);
  });

  it('deve delegar execução para CalendarTools', async () => {
    calendarTools.execute.mockResolvedValue([{ id: 'event-1' }]);

    const result = await service.execute('list_calendar_events', {
      customerId: 'customer-1',
    });

    expect(calendarTools.execute).toHaveBeenCalledWith('list_calendar_events', {
      customerId: 'customer-1',
    });
    expect(result).toEqual([{ id: 'event-1' }]);
  });

  it('deve lançar BadRequestException para tool desconhecida', async () => {
    await expect(service.execute('tool_invalida', {})).rejects.toThrow(
      BadRequestException,
    );
  });
});
