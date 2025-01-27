import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Verify required environment variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in .env.local');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Article {
  id: string;
  title: string;
  content: string;
  slug: string;
  excerpt: string;
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Verify OpenAI API key
async function verifyApiKey() {
  try {
    const keyPreview = process.env.OPENAI_API_KEY?.substring(0, 8) + '...';
    console.log(`Verifying OpenAI API key: ${keyPreview}`);
    // Try to create a simple embedding as a test
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'test',
    });
    console.log('API key is valid!');
    return true;
  } catch (error: any) {
    console.error('Error verifying API key:', error.message);
    if (error?.status === 401) {
      console.error('Invalid or expired API key');
    } else if (error?.status === 429) {
      console.error('Rate limit exceeded');
    }
    return false;
  }
}

async function generateEmbedding(text: string, retries = 3): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    if (error?.status === 429 && retries > 0) { // Rate limit error
      console.log(`Rate limited. Waiting 20 seconds before retry. ${retries} retries left.`);
      await delay(20000); // Wait 20 seconds
      return generateEmbedding(text, retries - 1);
    }
    throw error;
  }
}

async function processArticles() {
  try {
    // Fetch all articles
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, content, slug, excerpt');

    if (fetchError) throw fetchError;
    if (!articles) {
      console.log('No articles found');
      return;
    }

    console.log(`Processing ${articles.length} articles...`);

    // Process each article
    for (const article of articles) {
      try {
        console.log(`Processing article: ${article.title}`);

        // Check if embedding already exists
        const { data: existing } = await supabase
          .from('embeddings')
          .select('id')
          .eq('title', article.title)
          .maybeSingle();

        if (existing) {
          console.log(`Skipping ${article.title} - embedding already exists`);
          continue;
        }

        // Generate embedding from title + content
        const embedding = await generateEmbedding(
          `${article.title}\n\n${article.excerpt}\n\n${article.content}`
        );

        // Store in embeddings table
        const { error: insertError } = await supabase
          .from('embeddings')
          .insert({
            title: article.title,
            content: article.content,
            url: `/articles/${article.slug}`,
            embedding
          });

        if (insertError) {
          console.error(`Error inserting embedding for ${article.title}:`, insertError);
          continue;
        }

        console.log(`Successfully processed: ${article.title}`);
        
        // Add a small delay between articles to avoid rate limits
        await delay(1000);
      } catch (error) {
        console.error(`Error processing article ${article.title}:`, error);
      }
    }

    console.log('Finished processing articles');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
async function main() {
  const isKeyValid = await verifyApiKey();
  if (!isKeyValid) {
    console.error('Exiting due to invalid API key');
    process.exit(1);
  }
  await processArticles();
}

main(); 