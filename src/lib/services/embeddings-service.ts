import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SearchResult {
  title: string;
  content: string;
  url?: string;
  score: number;
}

export async function searchSimilarDocuments(
  query: string,
  matchThreshold: number = 0.7,
  matchCount: number = 3
): Promise<SearchResult[]> {
  try {
    // Get embedding for the query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query
      })
    });

    const { data: [{ embedding }] } = await embeddingResponse.json();

    // Search for similar content in Supabase
    const { data: matches, error } = await supabase.rpc(
      'match_embeddings',
      {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      }
    );

    if (error) throw error;

    return matches.map((match: any) => ({
      title: match.title,
      content: match.content,
      url: match.url,
      score: match.similarity
    }));
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
}

export async function addDocument(
  title: string,
  content: string,
  url?: string
): Promise<boolean> {
  try {
    // Get embedding for the content
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: content
      })
    });

    const { data: [{ embedding }] } = await embeddingResponse.json();

    // Insert document with embedding into Supabase
    const { error } = await supabase
      .from('embeddings')
      .insert({
        title,
        content,
        url,
        embedding
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding document:', error);
    return false;
  }
} 