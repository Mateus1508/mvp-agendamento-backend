import { Injectable } from '@nestjs/common';
import { AppointmentsService } from '../../appointments/appointments.service';
import { AgentToolDefinition } from './agent-tool.types';

export const APPOINTMENT_TOOL_NAMES = [
  'list_appointments',
  'get_appointment',
  'create_appointment',
  'update_appointment',
  'delete_appointment',
] as const;

export type AppointmentToolName = (typeof APPOINTMENT_TOOL_NAMES)[number];

export const appointmentTools: AgentToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_appointments',
      description: 'Lista todos os agendamentos com os dados do cliente.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_appointment',
      description: 'Busca um agendamento pelo id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Id do agendamento' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description:
        'Cria um agendamento. A data deve estar em ISO 8601, com horário em horas cheias entre 08:00 e 17:00 (fuso America/Sao_Paulo).',
      parameters: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'Id do cliente' },
          date: {
            type: 'string',
            description:
              'Data e horário do agendamento em ISO 8601 (ex: 2026-06-27T14:00:00.000Z para 11:00 em São Paulo)',
          },
        },
        required: ['customerId', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_appointment',
      description:
        'Atualiza um agendamento existente. Se informar date, deve ser hora cheia entre 08:00 e 17:00.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Id do agendamento' },
          customerId: { type: 'string', description: 'Novo id do cliente' },
          date: { type: 'string', description: 'Nova data em ISO 8601' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_appointment',
      description: 'Remove um agendamento pelo id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Id do agendamento' },
        },
        required: ['id'],
      },
    },
  },
];

@Injectable()
export class AppointmentsTools {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  async execute(
    name: AppointmentToolName,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (name) {
      case 'list_appointments':
        return this.appointmentsService.findAll();

      case 'get_appointment':
        return this.appointmentsService.findOne(toRequiredString(args.id));

      case 'create_appointment':
        return this.appointmentsService.create({
          customerId: toRequiredString(args.customerId),
          date: toRequiredString(args.date),
        });

      case 'update_appointment':
        return this.appointmentsService.update(toRequiredString(args.id), {
          customerId: toOptionalString(args.customerId),
          date: toOptionalString(args.date),
        });

      case 'delete_appointment':
        return this.appointmentsService.remove(toRequiredString(args.id));

      default:
        throw new Error(`Tool de agendamento desconhecida: ${String(name)}`);
    }
  }
}

function toRequiredString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
