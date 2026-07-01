import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ClientAuthGuard } from '../auth/guards/client-auth.guard';
import { DiscoveryService } from './discovery.service';
import { ChatDto, DiscoveryChatResponseDto } from './dto/chat.dto';

@Controller('agent/discovery')
@UseGuards(ClientAuthGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post('chat')
  chat(@Body() chatDto: ChatDto): Promise<DiscoveryChatResponseDto> {
    return this.discoveryService.chat(chatDto);
  }
}
