import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { AgentMemoryService } from './agent-memory.service';

describe('AgentMemoryService', () => {
  let service: AgentMemoryService;

  const prisma = {
    agentSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentMemoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AgentMemoryService>(AgentMemoryService);
    jest.clearAllMocks();
  });

  it('deve criar uma nova sessão quando sessionId não for informado', async () => {
    prisma.agentSession.create.mockResolvedValue({
      id: 'session-1',
      customerId: null,
      name: null,
      phone: null,
      notes: null,
    });

    const memory = await service.getOrCreate();

    expect(prisma.agentSession.create).toHaveBeenCalledWith({ data: {} });
    expect(memory).toEqual({ sessionId: 'session-1' });
  });

  it('deve retornar sessão existente', async () => {
    prisma.agentSession.findUnique.mockResolvedValue({
      id: 'session-1',
      customerId: 'customer-1',
      name: 'Maria',
      phone: '11999999999',
      notes: null,
    });

    const memory = await service.getOrCreate('session-1');

    expect(memory).toEqual({
      sessionId: 'session-1',
      customerId: 'customer-1',
      name: 'Maria',
      phone: '11999999999',
    });
  });

  it('deve montar contexto com informações do cliente', () => {
    const context = service.buildContextPrompt({
      sessionId: 'session-1',
      customerId: 'customer-1',
      name: 'Maria',
      phone: '11999999999',
    });

    expect(context).toContain('Maria');
    expect(context).toContain('11999999999');
    expect(context).toContain('customer-1');
  });

  it('deve extrair dados do cliente de um agendamento', () => {
    const data = service.extractCustomerData({
      id: 'appointment-1',
      customer: {
        id: 'customer-1',
        name: 'Maria',
        phone: '11999999999',
      },
    });

    expect(data).toEqual({
      customerId: 'customer-1',
      name: 'Maria',
      phone: '11999999999',
    });
  });

  it('deve sincronizar memória após tool de cliente', async () => {
    prisma.agentSession.findUnique.mockResolvedValue({
      id: 'session-1',
      customerId: null,
      name: null,
      phone: null,
      notes: null,
    });
    prisma.agentSession.update.mockResolvedValue({
      id: 'session-1',
      customerId: 'customer-1',
      name: 'Maria',
      phone: '11999999999',
      notes: null,
    });

    await service.syncFromToolResult('session-1', 'create_customer', {
      id: 'customer-1',
      name: 'Maria',
      phone: '11999999999',
    });

    expect(prisma.agentSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        customerId: 'customer-1',
        name: 'Maria',
        phone: '11999999999',
        notes: undefined,
      },
    });
  });
});
