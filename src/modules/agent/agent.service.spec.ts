import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { LlmService } from '../llm/llm.service';
import { AgentMemoryService } from './memory/agent-memory.service';
import { AgentToolsService } from './tools/agent-tools.service';

describe('AgentService', () => {
  let service: AgentService;

  const llmService = {
    complete: jest.fn(),
  };

  const agentToolsService = {
    getDefinitions: jest.fn().mockReturnValue([]),
    execute: jest.fn(),
  };

  const agentMemoryService = {
    getOrCreate: jest.fn().mockResolvedValue({ sessionId: 'session-1' }),
    buildContextPrompt: jest.fn().mockReturnValue(null),
    syncFromToolResult: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: LlmService, useValue: llmService },
        { provide: AgentToolsService, useValue: agentToolsService },
        { provide: AgentMemoryService, useValue: agentMemoryService },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('deve retornar a resposta da IA', async () => {
      llmService.complete.mockResolvedValue({
        content: 'Posso ajudar com o agendamento.',
      });

      const result = await service.chat({ message: 'Quero marcar um horário' });

      expect(llmService.complete).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({
            role: 'user',
            content: 'Quero marcar um horário',
          }),
        ]),
        tools: [],
      });
      expect(result).toEqual({
        reply: 'Posso ajudar com o agendamento.',
        sessionId: 'session-1',
      });
    });

    it('deve incluir memória do cliente no prompt do sistema', async () => {
      agentMemoryService.getOrCreate.mockResolvedValue({
        sessionId: 'session-1',
        customerId: 'customer-1',
        name: 'Maria',
        phone: '11999999999',
      });
      agentMemoryService.buildContextPrompt.mockReturnValue(
        'Informações conhecidas sobre o cliente nesta sessão:\n- Nome: Maria',
      );
      llmService.complete.mockResolvedValue({
        content: 'Olá Maria, como posso ajudar?',
      });

      await service.chat({
        message: 'Oi',
        sessionId: 'session-1',
      });

      expect(agentMemoryService.getOrCreate).toHaveBeenCalledWith('session-1');
      expect(llmService.complete).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Maria'),
          }),
        ]),
        tools: [],
      });
    });

    it('deve enviar histórico de mensagens quando informado', async () => {
      llmService.complete.mockResolvedValue({
        content: 'Claro, qual horário prefere?',
      });

      await service.chat({
        message: 'Pode ser amanhã?',
        messages: [
          { role: 'user', content: 'Quero marcar um horário' },
          { role: 'assistant', content: 'Para qual dia?' },
        ],
      });

      expect(llmService.complete).toHaveBeenCalledWith({
        messages: [
          expect.objectContaining({ role: 'system' }),
          { role: 'user', content: 'Quero marcar um horário' },
          { role: 'assistant', content: 'Para qual dia?' },
          { role: 'user', content: 'Pode ser amanhã?' },
        ],
        tools: [],
      });
    });

    it('deve executar tools e continuar a conversa', async () => {
      llmService.complete
        .mockResolvedValueOnce({
          content: null,
          toolCalls: [
            {
              id: 'call-1',
              type: 'function',
              function: {
                name: 'list_appointments',
                arguments: '{}',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          content: 'Encontrei 1 agendamento disponível.',
        });

      agentToolsService.execute.mockResolvedValue([{ id: 'appointment-1' }]);

      const result = await service.chat({ message: 'Quais horários existem?' });

      expect(agentToolsService.execute).toHaveBeenCalledWith(
        'list_appointments',
        {},
      );
      expect(llmService.complete).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        reply: 'Encontrei 1 agendamento disponível.',
        sessionId: 'session-1',
      });
    });

    it('deve devolver erro da tool ao modelo e continuar a conversa', async () => {
      llmService.complete
        .mockResolvedValueOnce({
          content: null,
          toolCalls: [
            {
              id: 'call-1',
              type: 'function',
              function: {
                name: 'get_customer',
                arguments: '{"id":"inexistente"}',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          content: 'Não encontrei esse cliente. Pode informar o nome?',
        });

      agentToolsService.execute.mockRejectedValue(
        new NotFoundException('Cliente com id "inexistente" não encontrado'),
      );

      const result = await service.chat({ message: 'Busque o cliente X' });

      const secondCallMessages = llmService.complete.mock.calls[1][0].messages;
      const toolMessage = secondCallMessages.find(
        (message: { role: string }) => message.role === 'tool',
      );

      expect(toolMessage?.content).toBe(
        JSON.stringify({
          success: false,
          error: 'Cliente com id "inexistente" não encontrado',
        }),
      );
      expect(result).toEqual({
        reply: 'Não encontrei esse cliente. Pode informar o nome?',
        sessionId: 'session-1',
      });
    });

    it('deve fazer uma última tentativa sem tools ao atingir o limite de iterações', async () => {
      const toolResponse = {
        content: null,
        toolCalls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'list_appointments',
              arguments: '{}',
            },
          },
        ],
      };

      llmService.complete
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce({
          content: 'Ainda estou processando, mas posso ajudar com outra data.',
        });

      agentToolsService.execute.mockResolvedValue([]);

      const result = await service.chat({ message: 'Quero agendar' });

      expect(llmService.complete).toHaveBeenCalledTimes(6);
      expect(llmService.complete.mock.calls[5][0]).toEqual({
        messages: expect.any(Array),
      });
      expect(llmService.complete.mock.calls[5][0].tools).toBeUndefined();
      expect(result).toEqual({
        reply: 'Ainda estou processando, mas posso ajudar com outra data.',
        sessionId: 'session-1',
      });
    });

    it('deve retornar fallback quando o limite de iterações for atingido sem resposta final', async () => {
      const toolResponse = {
        content: null,
        toolCalls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'list_appointments',
              arguments: '{}',
            },
          },
        ],
      };

      llmService.complete
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce(toolResponse)
        .mockResolvedValueOnce({ content: '' });

      agentToolsService.execute.mockResolvedValue([]);

      const result = await service.chat({ message: 'Quero agendar' });

      expect(result).toEqual({
        reply:
          'Não consegui concluir sua solicitação no momento. Pode tentar novamente com mais detalhes?',
        sessionId: 'session-1',
      });
    });

    it('deve lançar BadRequestException quando mensagem for vazia', async () => {
      await expect(service.chat({ message: '   ' })).rejects.toThrow(
        new BadRequestException('A mensagem não pode ser vazia'),
      );
      expect(llmService.complete).not.toHaveBeenCalled();
    });

    it('deve lançar InternalServerErrorException quando resposta vier vazia', async () => {
      llmService.complete.mockResolvedValue({ content: '' });

      await expect(service.chat({ message: 'Olá' })).rejects.toThrow(
        new InternalServerErrorException('A IA não retornou uma resposta válida'),
      );
    });
  });
});
