import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';
import { CACHE_KEYS } from '../../cache/cache.constants';
import { CompaniesService } from '../companies/companies.service';
import { PublicCompanySummary } from '../companies/companies.types';
import { LlmService } from '../llm/llm.service';
import { CachedDiscoveryResponse } from './discovery-cache.types';
import { DISCOVERY_AGENT_SYSTEM_PROMPT } from './discovery.prompt';
import { ChatDto, DiscoveryChatResponseDto } from './dto/chat.dto';
import {
  buildCachedDiscoveryReply,
  resolveSegmentFromConversation,
} from './segment-resolver';
import {
  AgentChatMessage,
  AgentToolCall,
  AgentToolDefinition,
} from './tools/agent-tool.types';

const LIST_COMPANIES_TOOL: AgentToolDefinition = {
  type: 'function',
  function: {
    name: 'list_companies_by_segment',
    description:
      'Lista empresas cadastradas em um segmento de serviço específico.',
    parameters: {
      type: 'object',
      properties: {
        segment: {
          type: 'string',
          description:
            'Nome exato do segmento, conforme a lista de segmentos disponíveis.',
        },
      },
      required: ['segment'],
    },
  },
};

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly companiesService: CompaniesService,
    private readonly cacheService: CacheService,
  ) {}

  async chat(chatDto: ChatDto): Promise<DiscoveryChatResponseDto> {
    const message = chatDto.message?.trim();

    if (!message) {
      throw new BadRequestException('A mensagem não pode ser vazia');
    }

    const resolvedSegment = resolveSegmentFromConversation(
      message,
      chatDto.messages,
    );

    if (resolvedSegment) {
      const cachedResponse = await this.getCachedDiscoveryResponse(resolvedSegment);

      if (cachedResponse) {
        this.logger.log(
          `Retornando discovery em cache para o segmento ${resolvedSegment}`,
        );

        return {
          reply: cachedResponse.reply,
          sessionId: chatDto.sessionId ?? randomUUID(),
          companies: cachedResponse.companies,
        };
      }
    }

    const messages = this.buildMessages(chatDto.messages, message);
    const { reply, companies, segment } = await this.runChatWithTools(messages);

    if (segment) {
      await this.cacheDiscoveryResponse(segment, reply, companies ?? []);
    }

    return {
      reply,
      sessionId: chatDto.sessionId ?? randomUUID(),
      companies,
    };
  }

  private async getCachedDiscoveryResponse(
    segment: string,
  ): Promise<CachedDiscoveryResponse | null> {
    const cached = await this.cacheService.get<CachedDiscoveryResponse>(
      CACHE_KEYS.discoveryBySegment(segment),
    );

    if (cached) {
      return cached;
    }

    const companies = await this.companiesService.listPublicBySegment(segment);

    if (!companies.length) {
      return null;
    }

    const response: CachedDiscoveryResponse = {
      reply: buildCachedDiscoveryReply(segment, companies.length),
      companies,
    };

    await this.cacheDiscoveryResponse(
      segment,
      response.reply,
      response.companies,
    );

    return response;
  }

  private async cacheDiscoveryResponse(
    segment: string,
    reply: string,
    companies: PublicCompanySummary[],
  ): Promise<void> {
    await this.cacheService.set(CACHE_KEYS.discoveryBySegment(segment), {
      reply,
      companies,
    } satisfies CachedDiscoveryResponse);
  }

  private buildMessages(
    history: ChatDto['messages'],
    message: string,
  ): AgentChatMessage[] {
    const messages: AgentChatMessage[] = [
      { role: 'system', content: DISCOVERY_AGENT_SYSTEM_PROMPT },
    ];

    if (history?.length) {
      messages.push(
        ...history.map((item) => ({
          role: item.role,
          content: item.content,
        })),
      );
    }

    messages.push({ role: 'user', content: message });
    return messages;
  }

  private async runChatWithTools(
    messages: AgentChatMessage[],
  ): Promise<{
    reply: string;
    companies?: PublicCompanySummary[];
    segment?: string;
  }> {
    const maxIterations = 5;
    let matchedCompanies: PublicCompanySummary[] | undefined;
    let resolvedSegment: string | undefined;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const response = await this.llmService.complete({
        messages,
        tools: [LIST_COMPANIES_TOOL],
      });

      if (response.toolCalls?.length) {
        messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.toolCalls,
        });

        for (const toolCall of response.toolCalls) {
          const result = await this.executeToolCall(toolCall);
          if (result.companies) {
            matchedCompanies = result.companies;
          }
          if (result.segment) {
            resolvedSegment = result.segment;
          }

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

      return { reply, companies: matchedCompanies, segment: resolvedSegment };
    }

    const finalResponse = await this.llmService.complete({ messages });
    const finalReply = finalResponse.content?.trim();

    if (finalReply) {
      return {
        reply: finalReply,
        companies: matchedCompanies,
        segment: resolvedSegment,
      };
    }

    return {
      reply:
        'Não consegui concluir sua solicitação no momento. Pode tentar novamente com mais detalhes?',
      companies: matchedCompanies,
      segment: resolvedSegment,
    };
  }

  private async executeToolCall(toolCall: AgentToolCall): Promise<{
    content: string;
    companies?: PublicCompanySummary[];
    segment?: string;
  }> {
    try {
      if (toolCall.function.name !== 'list_companies_by_segment') {
        throw new BadRequestException(
          `Tool desconhecida: ${toolCall.function.name}`,
        );
      }

      const args = JSON.parse(toolCall.function.arguments || '{}') as {
        segment?: string;
      };
      const segment = args.segment?.trim();

      if (!segment) {
        throw new BadRequestException(
          'Informe o segmento para buscar empresas',
        );
      }

      const companies =
        await this.companiesService.listPublicBySegment(segment);

      return {
        content: JSON.stringify({ success: true, data: companies }),
        companies,
        segment,
      };
    } catch (error) {
      return {
        content: JSON.stringify({
          success: false,
          error: this.getErrorMessage(error),
        }),
      };
    }
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
