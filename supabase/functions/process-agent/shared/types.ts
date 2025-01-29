export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: {
    agentId: string;
    timestamp: number;
    tools?: string[];
    userId?: string;
    token?: string;
    customer?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface AgentContext {
  messages: AgentMessage[];
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
}

export interface AgentConfig {
  agentId: string;
  agentType: string;
  systemMessage: string;
  openAiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export type AgentEnvironment = 'edge' | 'server'; 