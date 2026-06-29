export type CustomerMemoryData = {
  customerId?: string;
  name?: string;
  phone?: string;
  notes?: string;
};

export type AgentSessionMemory = {
  sessionId: string;
  customerId?: string;
  name?: string;
  phone?: string;
  notes?: string;
};
