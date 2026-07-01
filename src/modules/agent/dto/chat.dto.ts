import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export type ChatRole = 'user' | 'assistant' | 'system';

export class ChatMessageDto {
  @IsIn(['user', 'assistant', 'system'])
  role: ChatRole;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages?: ChatMessageDto[];
}

export class ChatResponseDto {
  reply: string;
  sessionId: string;
}

export class DiscoveryChatResponseDto {
  reply: string;
  sessionId: string;
  companies?: Array<{
    id: string;
    slug: string;
    name: string;
    segment: string;
    city: string | null;
    state: string | null;
    servicesPreview: string[];
    bookingUrl: string;
  }>;
}
