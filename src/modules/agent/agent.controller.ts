import { Body, Controller, Post } from '@nestjs/common';
import { AgentService } from './agent.service';
import { ChatDto, ChatResponseDto } from './dto/chat.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  chat(@Body() chatDto: ChatDto): Promise<ChatResponseDto> {
    return this.agentService.chat(chatDto);
  }
}
