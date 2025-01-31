import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Log the first and last 4 characters of the API key for debugging
console.log('Using API Key:', process.env.OPENAI_API_KEY?.slice(0, 4) + '...' + process.env.OPENAI_API_KEY?.slice(-4));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AIResponse {
  content: string;
  sources?: {
    title: string;
    url: string;
  }[];
}

export class AISupportService {
  private static instance: AISupportService;
  private context: string = '';

  private constructor() {
    // Initialize with system context
    this.context = `You are a helpful customer support AI assistant. 
    Your goal is to help users by:
    1. Answering their questions using the knowledge base
    2. Creating support tickets when necessary
    3. Providing relevant documentation links
    4. Being friendly and professional`;
  }

  public static getInstance(): AISupportService {
    if (!AISupportService.instance) {
      AISupportService.instance = new AISupportService();
    }
    return AISupportService.instance;
  }

  async searchKnowledgeBase(query: string): Promise<any[]> {
    const { data: articles, error } = await supabase
      .from('articles')
      .select('title, content, id')
      .textSearch('content', query);

    if (error) throw error;
    return articles || [];
  }

  async generateResponse(
    message: string,
    conversationHistory: ChatCompletionMessageParam[] = []
  ): Promise<AIResponse> {
    // Search knowledge base first
    const relevantArticles = await this.searchKnowledgeBase(message);
    
    // Prepare conversation context
    const context = relevantArticles
      .map(article => `Relevant article: ${article.title}\n${article.content}`)
      .join('\n\n');

    // Prepare messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.context },
      { role: 'system', content: `Knowledge base context:\n${context}` },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract sources from relevant articles
    const sources = relevantArticles.map(article => ({
      title: article.title,
      url: `/portal/knowledge-base/article/${article.id}`
    }));

    return {
      content: completion.choices[0].message.content || 'I apologize, but I was unable to generate a response.',
      sources: sources.length > 0 ? sources : undefined
    };
  }

  async shouldCreateTicket(message: string): Promise<boolean> {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analyze if this customer message requires creating a support ticket. Return true if the issue needs human support, false if it can be handled by AI or documentation.'
        },
        { role: 'user', content: message }
      ],
      temperature: 0,
      max_tokens: 50,
    });

    const response = completion.choices[0].message.content?.toLowerCase();
    return response?.includes('true') || false;
  }
} 