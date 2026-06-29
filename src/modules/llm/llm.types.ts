export type LlmToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

export type LlmToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type LlmChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
};

export type LlmCompletionRequest = {
  messages: LlmChatMessage[];
  tools?: LlmToolDefinition[];
};

export type LlmCompletionResponse = {
  content: string | null;
  toolCalls?: LlmToolCall[];
};
