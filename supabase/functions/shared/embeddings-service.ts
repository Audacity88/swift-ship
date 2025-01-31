import { createClient, OpenAI, Configuration } from '../quote-agent/deps.ts';

export interface SearchResult {
  id: number;
  title: string;
  content: string;
  url: string;
  similarity: number;
}

export class EmbeddingsService {
  private supabase;
  private openai;

  constructor(supabaseUrl: string, supabaseKey: string, openaiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI(new Configuration({ apiKey: openaiKey }));
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.createEmbedding({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data.data[0].embedding;
  }

  async searchSimilarContent(query: string, threshold = 0.5, limit = 5): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search for similar content
      const { data: results, error } = await this.supabase.rpc('match_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      }) as { data: SearchResult[] | null, error: any };
      
      if (error) throw error;
      return results || [];
    } catch (error) {
      console.error('Error searching similar content:', error);
      return [];
    }
  }
} 