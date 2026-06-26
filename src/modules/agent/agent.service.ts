import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChatDto, ChatResponseDto } from './dto/chat.dto';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from './agent.prompt';
import { AgentChatMessage, AgentToolCall } from './tools/agent-tool.types';
import { AgentToolsService } from './tools/agent-tools.service';

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: AgentToolCall[];
    };
    finish_reason?: string;
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class AgentService {
  private readonly apiKey = process.env.OPENROUTER_API_KEY;
  private readonly model = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o';
  private readonly apiUrl =
    process.env.OPENROUTER_API_URL ??
    'https://openrouter.ai/api/v1/chat/completions';
  private readonly systemPrompt =
    process.env.AGENT_SYSTEM_PROMPT ?? DEFAULT_AGENT_SYSTEM_PROMPT;

  constructor(private readonly agentToolsService: AgentToolsService) {}

  async chat(chatDto: ChatDto): Promise<ChatResponseDto> {
    const message = chatDto.message?.trim();

    if (!message) {
      throw new BadRequestException('A mensagem não pode ser vazia');
    }

    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Integração de IA não configurada. Defina OPENROUTER_API_KEY no ambiente.',
      );
    }

    const messages = this.buildMessages(chatDto.messages, message);
    const reply = await this.runChatWithTools(messages);

    return { reply };
  }

  private buildMessages(
    history: ChatDto['messages'],
    message: string,
  ): AgentChatMessage[] {
    const messages: AgentChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
    ];

    if (history?.length) {
      messages.push(...history);
    }

    messages.push({ role: 'user', content: message });
    return messages;
  }

  private async runChatWithTools(
    messages: AgentChatMessage[],
  ): Promise<string> {
    const maxIterations = 5;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const data = await this.requestCompletion(messages);
      const choice = data.choices?.[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage) {
        throw new InternalServerErrorException(
          'A IA não retornou uma resposta válida',
        );
      }

      if (assistantMessage.tool_calls?.length) {
        messages.push({
          role: 'assistant',
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls,
        });

        for (const toolCall of assistantMessage.tool_calls) {
          const result = await this.executeToolCall(toolCall);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        continue;
      }

      const reply = assistantMessage.content?.trim();

      if (!reply) {
        throw new InternalServerErrorException(
          'A IA não retornou uma resposta válida',
        );
      }

      return reply;
    }

    throw new InternalServerErrorException(
      'Limite de iterações de tools atingido',
    );
  }

  private async executeToolCall(toolCall: AgentToolCall): Promise<unknown> {
    const args = JSON.parse(toolCall.function.arguments || '{}') as Record<
      string,
      unknown
    >;

    return this.agentToolsService.execute(toolCall.function.name, args);
  }

  private async requestCompletion(
    messages: AgentChatMessage[],
  ): Promise<OpenRouterChatResponse> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools: this.agentToolsService.getDefinitions(),
        tool_choice: 'auto',
      }),
    });

    const data = (await response.json()) as OpenRouterChatResponse;

    if (!response.ok) {
      throw new InternalServerErrorException(
        data.error?.message ?? 'Falha ao gerar resposta da IA',
      );
    }

    return data;
  }
}
