import { config } from 'dotenv';
import { resolve } from 'path';
import fetch from 'node-fetch';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:', {
    SUPABASE_URL: !!SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY
  });
  process.exit(1);
}

async function testAgent(query: string, agent: string) {
  console.log(`\nTesting ${agent} agent with query: "${query}"\n`);
  
  const url = `${SUPABASE_URL}/functions/v1/process-agent`;
  console.log('Request URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
        agent: agent,
      }),
    });

    console.log('Response Status:', response.status);
    
    // Log headers as an object
    const headers: { [key: string]: string } = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('Response Headers:', headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.sources?.length) {
      console.log('\nSources:');
      data.sources.forEach((source: { title: string; url: string }) => {
        console.log(`- ${source.title} (${source.url})`);
      });
    }
    
    console.log('\n' + '-'.repeat(80) + '\n');
    return data;
  } catch (error: any) {
    console.error('Error details:', {
      name: error?.name || 'Unknown error',
      message: error?.message || 'No error message available',
      stack: error?.stack || 'No stack trace available',
    });
    throw error;
  }
}

// Test queries for different agents
const tests = [
  // Documentation queries
  { query: 'How do I track my package?', agent: 'docs' },
  { query: 'What should I do if my package is lost?', agent: 'docs' },
  { query: 'Tell me about international shipping', agent: 'docs' },
  
  // Support queries
  { query: 'I can\'t log into my account', agent: 'support' },
  { query: 'The tracking page is not loading', agent: 'support' },
  
  // Billing queries
  { query: 'How much does international shipping cost?', agent: 'billing' },
  { query: 'Can I get a refund for a cancelled shipment?', agent: 'billing' },
];

// Run all tests sequentially
async function runTests() {
  for (const test of tests) {
    try {
      await testAgent(test.query, test.agent);
    } catch (error) {
      console.error(`Test failed for query "${test.query}" with agent "${test.agent}":`, error);
    }
  }
}

runTests(); 