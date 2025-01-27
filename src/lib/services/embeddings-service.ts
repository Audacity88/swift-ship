import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SearchResult {
  id: number;
  title: string;
  content: string;
  url: string;
  similarity: number;
}

export class EmbeddingsService {
  private static instance: EmbeddingsService;

  private constructor() {}

  public static getInstance(): EmbeddingsService {
    if (!EmbeddingsService.instance) {
      EmbeddingsService.instance = new EmbeddingsService();
    }
    return EmbeddingsService.instance;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async searchSimilarContent(query: string, threshold = 0.5, limit = 5): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Search for similar content
    const { data: results, error } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    }) as { data: SearchResult[] | null, error: any };
    
    if (error) throw error;
    return results || [];
  }

  async addDocument(title: string, content: string, url: string): Promise<void> {
    try {
      // Generate embedding from title + content
      const embedding = await this.generateEmbedding(`${title}\n\n${content}`);

      // Store in embeddings table
      const { error: insertError } = await supabase
        .from('embeddings')
        .insert({
          title,
          content,
          url,
          embedding
        });

      if (insertError) throw insertError;
    } catch (error) {
      console.error(`Error adding document: ${title}`, error);
      throw error;
    }
  }
} 