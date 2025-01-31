import { ChatCompletionMessageParam } from 'npm:openai@4';

export interface AgentMessage extends ChatCompletionMessageParam {
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
    sources?: { title: string; url: string }[];
  };
}

export interface AgentContext {
  messages: AgentMessage[];
  metadata?: Record<string, any>;
}

export interface AgentRequest {
  message: string;
  conversationHistory: AgentMessage[];
  agentType?: string;
  metadata?: {
    userId?: string;
    token?: string;
    customer?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}; 