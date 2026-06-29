import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmToolCall,
} from './llm.types';

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: LlmToolCall[];
    };
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class LlmService {
  private readonly apiKey = process.env.OPENROUTER_API_KEY;
  private readonly model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o';
  private readonly apiUrl =
    process.env.OPENROUTER_API_URL ??
    'https://openrouter.ai/api/v1/chat/completions';

  async complete(
    request: LlmCompletionRequest,
  ): Promise<LlmCompletionResponse> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Integração de IA não configurada. Defina OPENROUTER_API_KEY no ambiente.',
      );
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        tools: request.tools,
        tool_choice: request.tools?.length ? 'auto' : undefined,
      }),
    });

    const data = (await response.json()) as OpenRouterChatResponse;

    if (!response.ok) {
      throw new InternalServerErrorException(
        data.error?.message ?? 'Falha ao gerar resposta da IA',
      );
    }

    const message = data.choices?.[0]?.message;

    if (!message) {
      throw new InternalServerErrorException(
        'A IA não retornou uma resposta válida',
      );
    }

    return {
      content: message.content ?? null,
      toolCalls: message.tool_calls,
    };
  }
}
