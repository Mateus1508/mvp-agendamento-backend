import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';

describe('LlmService', () => {
  let service: LlmService;
  const originalEnv = process.env;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      OPENROUTER_API_KEY: 'test-api-key',
      OPENROUTER_MODEL: 'openai/gpt-4o',
    };

    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmService],
    }).compile();

    service = module.get<LlmService>(LlmService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('deve retornar a resposta da IA', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Posso ajudar com o agendamento.' } }],
      }),
    });

    const result = await service.complete({
      messages: [{ role: 'user', content: 'Olá' }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      }),
    );
    expect(result).toEqual({
      content: 'Posso ajudar com o agendamento.',
      toolCalls: undefined,
    });
  });

  it('deve enviar tools quando informadas', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: null, tool_calls: [] } }],
      }),
    });

    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'list_customers',
          description: 'Lista clientes',
          parameters: { type: 'object' as const, properties: {} },
        },
      },
    ];

    await service.complete({
      messages: [{ role: 'user', content: 'Olá' }],
      tools,
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(requestBody.tools).toEqual(tools);
    expect(requestBody.tool_choice).toBe('auto');
  });

  it('deve lançar ServiceUnavailableException sem OPENROUTER_API_KEY', async () => {
    delete process.env.OPENROUTER_API_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmService],
    }).compile();

    const serviceWithoutKey = module.get<LlmService>(LlmService);

    await expect(
      serviceWithoutKey.complete({
        messages: [{ role: 'user', content: 'Olá' }],
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('deve lançar InternalServerErrorException quando a API falhar', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    await expect(
      service.complete({
        messages: [{ role: 'user', content: 'Olá' }],
      }),
    ).rejects.toThrow(new InternalServerErrorException('Rate limit exceeded'));
  });

  it('deve lançar InternalServerErrorException quando resposta vier vazia', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    await expect(
      service.complete({
        messages: [{ role: 'user', content: 'Olá' }],
      }),
    ).rejects.toThrow(
      new InternalServerErrorException('A IA não retornou uma resposta válida'),
    );
  });
});
