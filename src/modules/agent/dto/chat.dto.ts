export type ChatRole = 'user' | 'assistant' | 'system';

export class ChatMessageDto {
  role: ChatRole;
  content: string;
}

export class ChatDto {
  message: string;
  messages?: ChatMessageDto[];
}

export class ChatResponseDto {
  reply: string;
}
