import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AgentSessionMemory, CustomerMemoryData } from './agent-memory.types';

@Injectable()
export class AgentMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(sessionId?: string): Promise<AgentSessionMemory> {
    if (sessionId) {
      const existing = await this.prisma.agentSession.findUnique({
        where: { id: sessionId },
      });

      if (existing) {
        return this.toMemory(existing);
      }
    }

    const created = await this.prisma.agentSession.create({ data: {} });
    return this.toMemory(created);
  }

  async update(
    sessionId: string,
    data: CustomerMemoryData,
  ): Promise<AgentSessionMemory> {
    const updated = await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        customerId: data.customerId,
        name: data.name,
        phone: data.phone,
        notes: data.notes,
      },
    });

    return this.toMemory(updated);
  }

  async merge(
    sessionId: string,
    data: CustomerMemoryData,
  ): Promise<AgentSessionMemory> {
    const current = await this.prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!current) {
      throw new Error(`Sessão "${sessionId}" não encontrada`);
    }

    return this.update(sessionId, {
      customerId: data.customerId ?? current.customerId ?? undefined,
      name: data.name ?? current.name ?? undefined,
      phone: data.phone ?? current.phone ?? undefined,
      notes: data.notes ?? current.notes ?? undefined,
    });
  }

  buildContextPrompt(memory: AgentSessionMemory): string | null {
    const lines: string[] = [];

    if (memory.customerId) {
      lines.push(`- Id do cliente: ${memory.customerId}`);
    }

    if (memory.name) {
      lines.push(`- Nome: ${memory.name}`);
    }

    if (memory.phone) {
      lines.push(`- Telefone: ${memory.phone}`);
    }

    if (memory.notes) {
      lines.push(`- Observações: ${memory.notes}`);
    }

    if (!lines.length) {
      return null;
    }

    return `Informações conhecidas sobre o cliente nesta sessão:\n${lines.join('\n')}`;
  }

  extractCustomerData(data: unknown): CustomerMemoryData | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const record = data as Record<string, unknown>;

    if (record.customer && typeof record.customer === 'object') {
      return this.extractCustomerData(record.customer);
    }

    if (
      typeof record.id === 'string' &&
      typeof record.name === 'string' &&
      typeof record.phone === 'string'
    ) {
      return {
        customerId: record.id,
        name: record.name,
        phone: record.phone,
      };
    }

    return null;
  }

  private extractCustomerIdFromCalendar(
    data: unknown,
  ): CustomerMemoryData | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const record = data as Record<string, unknown>;

    if (typeof record.customerId === 'string') {
      return { customerId: record.customerId };
    }

    return null;
  }

  async syncFromToolResult(
    sessionId: string,
    toolName: string,
    data: unknown,
  ): Promise<void> {
    const customerTools = new Set([
      'create_customer',
      'get_customer',
      'update_customer',
    ]);

    const appointmentTools = new Set([
      'create_appointment',
      'get_appointment',
      'update_appointment',
    ]);

    const calendarTools = new Set([
      'create_calendar_event',
      'update_calendar_event',
    ]);

    if (
      !customerTools.has(toolName) &&
      !appointmentTools.has(toolName) &&
      !calendarTools.has(toolName)
    ) {
      return;
    }

    const customerData =
      this.extractCustomerData(data) ??
      this.extractCustomerIdFromCalendar(data);

    if (!customerData) {
      return;
    }

    await this.merge(sessionId, customerData);
  }

  private toMemory(session: {
    id: string;
    customerId: string | null;
    name: string | null;
    phone: string | null;
    notes: string | null;
  }): AgentSessionMemory {
    return {
      sessionId: session.id,
      customerId: session.customerId ?? undefined,
      name: session.name ?? undefined,
      phone: session.phone ?? undefined,
      notes: session.notes ?? undefined,
    };
  }
}
