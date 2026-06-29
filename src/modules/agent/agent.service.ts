import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from './agent.prompt';
import { ChatDto, ChatResponseDto } from './dto/chat.dto';
import { AgentMemoryService } from './memory/agent-memory.service';
import { AgentSessionMemory } from './memory/agent-memory.types';
import { LlmService } from '../llm/llm.service';
import { AgentChatMessage, AgentToolCall } from './tools/agent-tool.types';
import { AgentToolsService } from './tools/agent-tools.service';

type ToolExecutionResult = {
  content: string;
  data?: unknown;
};

@Injectable()
export class AgentService {
  private readonly systemPrompt =
    process.env.AGENT_SYSTEM_PROMPT ?? DEFAULT_AGENT_SYSTEM_PROMPT;

  constructor(
    private readonly llmService: LlmService,
    private readonly agentToolsService: AgentToolsService,
    private readonly agentMemoryService: AgentMemoryService,
  ) {}

  async chat(chatDto: ChatDto): Promise<ChatResponseDto> {
    const message = chatDto.message?.trim();

    if (!message) {
      throw new BadRequestException('A mensagem não pode ser vazia');
    }

    const memory = await this.agentMemoryService.getOrCreate(chatDto.sessionId);
    const messages = this.buildMessages(chatDto.messages, message, memory);
    const reply = await this.runChatWithTools(messages, memory.sessionId);

    return { reply, sessionId: memory.sessionId };
  }

  private buildMessages(
    history: ChatDto['messages'],
    message: string,
    memory: AgentSessionMemory,
  ): AgentChatMessage[] {
    const memoryContext = this.agentMemoryService.buildContextPrompt(memory);
    const systemContent = memoryContext
      ? `${this.systemPrompt}\n\n${memoryContext}`
      : this.systemPrompt;

    const messages: AgentChatMessage[] = [
      { role: 'system', content: systemContent },
    ];

    if (history?.length) {
      messages.push(...history);
    }

    messages.push({ role: 'user', content: message });
    return messages;
  }

  private async runChatWithTools(
    messages: AgentChatMessage[],
    sessionId: string,
  ): Promise<string> {
    const maxIterations = 5;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const response = await this.llmService.complete({
        messages,
        tools: this.agentToolsService.getDefinitions(),
      });

      if (response.toolCalls?.length) {
        messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.toolCalls,
        });

        for (const toolCall of response.toolCalls) {
          const result = await this.executeToolCall(toolCall, sessionId);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result.content,
          });
        }

        continue;
      }

      const reply = response.content?.trim();

      if (!reply) {
        throw new InternalServerErrorException(
          'A IA não retornou uma resposta válida',
        );
      }

      return reply;
    }

    const finalResponse = await this.llmService.complete({ messages });
    const finalReply = finalResponse.content?.trim();

    if (finalReply) {
      return finalReply;
    }

    return 'Não consegui concluir sua solicitação no momento. Pode tentar novamente com mais detalhes?';
  }

  private async executeToolCall(
    toolCall: AgentToolCall,
    sessionId: string,
  ): Promise<ToolExecutionResult> {
    try {
      const args = JSON.parse(toolCall.function.arguments || '{}') as Record<
        string,
        unknown
      >;

      const data = await this.agentToolsService.execute(
        toolCall.function.name,
        args,
      );

      await this.agentMemoryService.syncFromToolResult(
        sessionId,
        toolCall.function.name,
        data,
      );

      return {
        content: this.formatToolSuccess(data),
        data,
      };
    } catch (error) {
      return {
        content: this.formatToolError(error),
      };
    }
  }

  private formatToolSuccess(data: unknown): string {
    return JSON.stringify({ success: true, data });
  }

  private formatToolError(error: unknown): string {
    return JSON.stringify({
      success: false,
      error: this.getErrorMessage(error),
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const message = (response as { message?: string | string[] }).message;

        if (Array.isArray(message)) {
          return message.join(', ');
        }

        if (message) {
          return message;
        }
      }

      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Erro desconhecido ao executar a ferramenta';
  }
}
