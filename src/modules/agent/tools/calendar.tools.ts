import { Injectable } from '@nestjs/common';
import { CalendarService } from '../../calendar/calendar.service';
import { AgentToolDefinition } from './agent-tool.types';

export const CALENDAR_TOOL_NAMES = [
  'list_calendar_events',
  'create_calendar_event',
  'update_calendar_event',
  'delete_calendar_event',
] as const;

export type CalendarToolName = (typeof CALENDAR_TOOL_NAMES)[number];

export const calendarTools: AgentToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_calendar_events',
      description:
        'Lista eventos do Google Calendar. Pode filtrar por cliente e intervalo de datas.',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: 'Id do cliente para filtrar eventos',
          },
          timeMin: {
            type: 'string',
            description: 'Data/hora mínima em ISO 8601',
          },
          timeMax: {
            type: 'string',
            description: 'Data/hora máxima em ISO 8601',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description:
        'Cria um evento no Google Calendar para um cliente. Use datas em ISO 8601.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Título do evento' },
          description: { type: 'string', description: 'Descrição do evento' },
          start: { type: 'string', description: 'Início em ISO 8601' },
          end: { type: 'string', description: 'Fim em ISO 8601' },
          customerId: { type: 'string', description: 'Id do cliente' },
        },
        required: ['summary', 'start', 'end', 'customerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_calendar_event',
      description: 'Atualiza um evento existente no Google Calendar.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Id do evento no Google Calendar',
          },
          summary: { type: 'string', description: 'Novo título do evento' },
          description: { type: 'string', description: 'Nova descrição' },
          start: { type: 'string', description: 'Novo início em ISO 8601' },
          end: { type: 'string', description: 'Novo fim em ISO 8601' },
          customerId: { type: 'string', description: 'Novo id do cliente' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_calendar_event',
      description: 'Remove um evento do Google Calendar pelo id.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Id do evento no Google Calendar',
          },
        },
        required: ['id'],
      },
    },
  },
];

@Injectable()
export class CalendarTools {
  constructor(private readonly calendarService: CalendarService) {}

  async execute(
    name: CalendarToolName,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (name) {
      case 'list_calendar_events':
        return this.calendarService.listEvents({
          customerId: args.customerId ? String(args.customerId) : undefined,
          timeMin: args.timeMin ? String(args.timeMin) : undefined,
          timeMax: args.timeMax ? String(args.timeMax) : undefined,
        });

      case 'create_calendar_event':
        return this.calendarService.createEvent({
          summary: String(args.summary),
          description: args.description ? String(args.description) : undefined,
          start: String(args.start),
          end: String(args.end),
          customerId: String(args.customerId),
        });

      case 'update_calendar_event':
        return this.calendarService.updateEvent(String(args.id), {
          summary: args.summary ? String(args.summary) : undefined,
          description: args.description ? String(args.description) : undefined,
          start: args.start ? String(args.start) : undefined,
          end: args.end ? String(args.end) : undefined,
          customerId: args.customerId ? String(args.customerId) : undefined,
        });

      case 'delete_calendar_event':
        return this.calendarService.deleteEvent(String(args.id));

      default:
        throw new Error(`Tool de calendário desconhecida: ${name}`);
    }
  }
}
