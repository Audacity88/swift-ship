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

interface TestScenario {
  name: string;
  query: string;
  agent: string;
}

const TEST_SCENARIOS: Record<string, TestScenario[]> = {
  router: [
    {
      name: 'Basic Routing',
      query: "I need help with my shipment",
      agent: "router"
    },
    {
      name: 'Ambiguous Query',
      query: "What's the best way to ship my package?",
      agent: "router"
    }
  ],
  quote: [
    {
      name: 'Detailed Quote Request',
      query: "I need a quote for shipping a container. It's a 40ft container with 50 tons of non-hazardous goods, volume is 65 cubic meters. Pickup from Los Angeles to New York next Monday at 9am",
      agent: "quote"
    },
    {
      name: 'Initial Quote Request',
      query: "I want to create a shipping quote",
      agent: "quote"
    }
  ],
  support: [
    {
      name: 'Tracking Issue',
      query: "I'm having trouble tracking my shipment SS123456789. The status hasn't updated in 2 days and I need to know where my package is",
      agent: "support"
    },
    {
      name: 'Technical Issue',
      query: "The tracking page keeps showing an error when I try to view my shipment details",
      agent: "support"
    }
  ],
  docs: [
    {
      name: 'Policy Query',
      query: "What are your policies regarding shipping restricted items?",
      agent: "docs"
    }
  ],
  shipments: [
    {
      name: 'Pickup Scheduling',
      query: "I need to schedule a pickup for my international shipment. What's the process and what information do you need?",
      agent: "shipments"
    }
  ]
};

async function testAgent(query: string, agent: string) {
  console.log(`\nTesting ${agent.toUpperCase()} with query: "${query}"\n`);
  
  const url = `${SUPABASE_URL}/functions/v1/process-agent`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        message: query,
        conversationHistory: [],
        agentType: agent,
        metadata: {
          test: true,
          timestamp: Date.now()
        }
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
            if (data.metadata) {
              console.log('\n\nMetadata:', JSON.stringify(data.metadata, null, 2));
            }
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
            if (data.metadata) {
              console.log('\n\nMetadata:', JSON.stringify(data.metadata, null, 2));
            }
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

async function runTests(agents: string[] = [], scenarios: string[] = []) {
  // If no specific agents are provided, test all agents
  const agentsToTest = agents.length > 0 ? agents : Object.keys(TEST_SCENARIOS);

  for (const agent of agentsToTest) {
    if (!TEST_SCENARIOS[agent]) {
      console.error(`Unknown agent: ${agent}`);
      continue;
    }

    console.log(`\n=== Testing ${agent.toUpperCase()} Agent ===\n`);
    
    const scenariosToTest = TEST_SCENARIOS[agent].filter(scenario => 
      scenarios.length === 0 || scenarios.includes(scenario.name)
    );

    for (const scenario of scenariosToTest) {
      console.log(`\n--- Scenario: ${scenario.name} ---`);
      await testAgent(scenario.query, scenario.agent);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const agents = [];
const scenarios = [];

let currentFlag = '';
for (const arg of args) {
  if (arg.startsWith('--')) {
    currentFlag = arg.slice(2);
  } else if (currentFlag === 'agent') {
    agents.push(arg.toLowerCase());
  } else if (currentFlag === 'scenario') {
    scenarios.push(arg);
  }
}

// Run tests based on command line arguments
runTests(agents, scenarios).catch(console.error);

// Export for programmatic use
export { runTests, TEST_SCENARIOS }; 