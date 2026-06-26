import { Injectable } from '@nestjs/common';
import { CustomersService } from '../../customers/customers.service';
import { AgentToolDefinition } from './agent-tool.types';

export const CUSTOMER_TOOL_NAMES = [
  'list_customers',
  'get_customer',
  'create_customer',
  'update_customer',
  'delete_customer',
] as const;

export type CustomerToolName = (typeof CUSTOMER_TOOL_NAMES)[number];

export const customerTools: AgentToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_customers',
      description: 'Lista todos os clientes cadastrados com seus agendamentos.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer',
      description: 'Busca um cliente pelo id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Id do cliente' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_customer',
      description: 'Cria um novo cliente.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome do cliente' },
          phone: { type: 'string', description: 'Telefone do cliente' },
        },
        required: ['name', 'phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_customer',
      description: 'Atualiza os dados de um cliente existente.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Id do cliente' },
          name: { type: 'string', description: 'Novo nome do cliente' },
          phone: { type: 'string', description: 'Novo telefone do cliente' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_customer',
      description: 'Remove um cliente pelo id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Id do cliente' },
        },
        required: ['id'],
      },
    },
  },
];

@Injectable()
export class CustomersTools {
  constructor(private readonly customersService: CustomersService) {}

  async execute(
    name: CustomerToolName,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (name) {
      case 'list_customers':
        return this.customersService.findAll();

      case 'get_customer':
        return this.customersService.findOne(String(args.id));

      case 'create_customer':
        return this.customersService.create({
          name: String(args.name),
          phone: String(args.phone),
        });

      case 'update_customer':
        return this.customersService.update(String(args.id), {
          name: args.name ? String(args.name) : undefined,
          phone: args.phone ? String(args.phone) : undefined,
        });

      case 'delete_customer':
        return this.customersService.remove(String(args.id));

      default:
        throw new Error(`Tool de cliente desconhecida: ${name}`);
    }
  }
}
