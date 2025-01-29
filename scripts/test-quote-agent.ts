import { createClient } from '@supabase/supabase-js';

// Test configuration
const config = {
  baseUrl: 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  testEmail: 'test@example.com',
  testPassword: 'testpassword123'
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

async function getAuthToken(): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.signInWithPassword({
    email: config.testEmail,
    password: config.testPassword
  });

  if (error) {
    console.error('Authentication error:', error);
    return null;
  }

  return session?.access_token || null;
}

async function sendMessage(message: string, token: string): Promise<void> {
  console.log('\n📤 Sending message:', message);
  
  try {
    const response = await fetch(`${config.baseUrl}/api/ai-support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        conversationHistory: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let sources: any[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                process.stdout.write(data.content);
                fullResponse += data.content;
              } else if (data.type === 'sources') {
                sources = data.sources || [];
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    }

    console.log('\n\n📚 Sources:', sources);
    console.log('\n-----------------------------------\n');
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting Quote Agent Tests\n');

  // Get auth token
  const token = await getAuthToken();
  if (!token) {
    console.error('Failed to get authentication token');
    return;
  }

  // Test cases
  const testCases = [
    {
      name: 'General Info Request',
      message: "What shipping options do you offer and how much do they cost?"
    },
    {
      name: 'Quote Lookup',
      message: "Can you check my quote status? My email is test@example.com"
    },
    {
      name: 'Create Quote Request',
      message: "I need a quote for shipping a 40ft container with electronics from Los Angeles to New York. The container weighs approximately 15 tons."
    },
    {
      name: 'Multi-turn Quote Creation - Step 1',
      message: "I need to ship some goods"
    },
    {
      name: 'Multi-turn Quote Creation - Step 2',
      message: "It's a full truckload of furniture from Miami to Chicago, about 20 tons"
    }
  ];

  // Run tests sequentially
  for (const test of testCases) {
    console.log(`\n📋 Test Case: ${test.name}`);
    await sendMessage(test.message, token);
  }
}

// Run the test suite
console.log('Starting tests...\n');
runTests()
  .then(() => console.log('\n✨ All tests completed'))
  .catch(error => console.error('\n💥 Test suite failed:', error)); 