import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SearchResult {
  id: number;
  title: string;
  content: string;
  url: string;
  similarity: number;
}

interface SearchParams {
  query_embedding: number[];
  match_threshold: number;
  match_count: number;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function searchSimilarContent(query: string, threshold = 0.5, limit = 5) {
  try {
    console.log(`\nSearching for content similar to: "${query}" (threshold: ${threshold})\n`);
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for similar content
    const { data: results, error } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    }) as { data: SearchResult[] | null, error: any };
    
    if (error) throw error;
    
    if (!results?.length) {
      console.log('No matches found.');
      return;
    }
    
    // Display results
    results.forEach((match: SearchResult) => {
      console.log(`\nMatch (${(match.similarity * 100).toFixed(2)}% similar):`);
      console.log(`Title: ${match.title}`);
      console.log(`URL: ${match.url}`);
      console.log(`Preview: ${match.content.substring(0, 150)}...`);
    });
    
  } catch (error) {
    console.error('Error searching for similar content:', error);
  }
}

// Test queries
const queries = [
  'How do I track my package?',
  'What should I do if my package is lost?',
  'How do I create a new shipment?',
  'Tell me about international shipping customs',
  'How do I change my account settings?'
];

async function runTests() {
  for (const query of queries) {
    await searchSimilarContent(query);
    console.log('\n' + '-'.repeat(80) + '\n');
  }
}

runTests(); 