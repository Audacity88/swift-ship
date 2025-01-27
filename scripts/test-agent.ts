import 'dotenv/config';
import { resolve } from 'path';
import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables');
}

async function testAgent(query: string, agent: string) {
  console.log(`\nTesting ${agent} with query: "${query}"\n`);
  
  const url = `${SUPABASE_URL}/functions/v1/process-agent`;
  
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}\n${errorText}`);
    }

    // Handle streaming response
    const decoder = new TextDecoder();
    let buffer = '';
    let sources = [];

    for await (const chunk of response.body) {
      const text = decoder.decode(Buffer.from(chunk));
      buffer += text;
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
      
      for (const line of lines) {
        if (line.trim() === '' || !line.startsWith('data: ')) continue;
        
        try {
          const data = JSON.parse(line.slice(5));
          if (data.type === 'chunk') {
            process.stdout.write(data.content);
          } else if (data.type === 'sources') {
            sources = data.sources;
          }
        } catch (error) {
          console.error('Error parsing JSON:', line);
        }
      }
    }

    // Process any remaining data in the buffer
    if (buffer.trim() !== '') {
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.trim() === '' || !line.startsWith('data: ')) continue;
        
        try {
          const data = JSON.parse(line.slice(5));
          if (data.type === 'chunk') {
            process.stdout.write(data.content);
          } else if (data.type === 'sources') {
            sources = data.sources;
          }
        } catch (error) {
          console.error('Error parsing JSON:', line);
        }
      }
    }

    if (sources?.length) {
      console.log('\n\nSources:');
      sources.forEach((source: { title: string; url: string }) => {
        console.log(`- ${source.title} (${source.url})`);
      });
    }
    
    console.log('\n' + '-'.repeat(80) + '\n');
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

async function runTests() {
  // Test Quote Agent
  await testAgent(
    "I need a quote for shipping a 20kg package from New York to London",
    "quote"
  );

  // Test Support Agent
  await testAgent(
    "I'm having trouble tracking my package. The tracking number is SS123456789",
    "support"
  );

  // Test Billing Agent
  await testAgent(
    "I need a refund for my cancelled shipment SS987654321",
    "billing"
  );
}

runTests().catch(console.error); 