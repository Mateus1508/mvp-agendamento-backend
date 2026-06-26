import {
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { AgentToolsService } from './tools/agent-tools.service';

describe('AgentService', () => {
  let service: AgentService;
  const originalEnv = process.env;
  const fetchMock = jest.fn();

  const agentToolsService = {
    getDefinitions: jest.fn().mockReturnValue([]),
    execute: jest.fn(),
  };

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      OPENROUTER_API_KEY: 'test-api-key',
      OPENROUTER_MODEL: 'openai/gpt-4o',
    };

    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: AgentToolsService, useValue: agentToolsService },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('chat', () => {
    it('deve retornar a resposta da IA', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Posso ajudar com o agendamento.' } }],
        }),
      });

      const result = await service.chat({ message: 'Quero marcar um horário' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
      expect(result).toEqual({ reply: 'Posso ajudar com o agendamento.' });
    });

    it('deve enviar histórico de mensagens quando informado', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Claro, qual horário prefere?' } }],
        }),
      });

      await service.chat({
        message: 'Pode ser amanhã?',
        messages: [
          { role: 'user', content: 'Quero marcar um horário' },
          { role: 'assistant', content: 'Para qual dia?' },
        ],
      });

      const requestBody = JSON.parse(
        fetchMock.mock.calls[0][1].body as string,
      );

      expect(requestBody.messages).toEqual([
        expect.objectContaining({ role: 'system' }),
        { role: 'user', content: 'Quero marcar um horário' },
        { role: 'assistant', content: 'Para qual dia?' },
        { role: 'user', content: 'Pode ser amanhã?' },
      ]);
    });

    it('deve lançar BadRequestException quando mensagem for vazia', async () => {
      await expect(service.chat({ message: '   ' })).rejects.toThrow(
        new BadRequestException('A mensagem não pode ser vazia'),
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('deve lançar ServiceUnavailableException sem OPENROUTER_API_KEY', async () => {
      delete process.env.OPENROUTER_API_KEY;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AgentService,
          { provide: AgentToolsService, useValue: agentToolsService },
        ],
      }).compile();

      const serviceWithoutKey = module.get<AgentService>(AgentService);

      await expect(
        serviceWithoutKey.chat({ message: 'Olá' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('deve lançar InternalServerErrorException quando a API falhar', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      });

      await expect(service.chat({ message: 'Olá' })).rejects.toThrow(
        new InternalServerErrorException('Rate limit exceeded'),
      );
    });

    it('deve lançar InternalServerErrorException quando resposta vier vazia', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
      });

      await expect(service.chat({ message: 'Olá' })).rejects.toThrow(
        new InternalServerErrorException('A IA não retornou uma resposta válida'),
      );
    });
  });
});
