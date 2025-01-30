import { QuoteAgent } from '../supabase/functions/quote-agent/quote-agent.js';
import { load } from 'https://deno.land/std/dotenv/mod.ts';

// Load environment variables from .env.local
const env = await load({ envPath: '.env.local' });

async function testQuoteAgent() {
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const quoteAgent = new QuoteAgent(baseUrl);

  // Test data matching the QuoteState interface
  const testQuoteDetails = {
    packageDetails: {
      type: 'full_truckload' as const,
      weight: '1',
      volume: '1',
      hazardous: false,
      specialRequirements: '',
      palletCount: '1'
    },
    addressDetails: {
      pickup: {
        address: '111 Jenkins St',
        city: 'Houston',
        state: 'TX'
      },
      delivery: {
        address: '222 York St',
        city: 'Houston',
        state: 'TX'
      },
      pickupDateTime: '2025-02-05 morning'
    },
    serviceDetails: {
      type: 'express_freight' as const,
      price: 2400,
      duration: '2-3 business days'
    }
  };

  const testMetadata = {
    customer: {
      id: '8a7923a3-87da-4ad7-91c2-92504d7b31d1',
      name: 'Dan Gilles',
      email: 'dangilles@outlook.com'
    },
    token: env.SUPABASE_SERVICE_ROLE_KEY
  };

  console.log('Testing QuoteAgent createTicketDirect...');
  try {
    const result = await quoteAgent.createTicketDirect(testQuoteDetails, testMetadata);
    console.log('Create Ticket Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      // Fetch the latest ticket to verify creation
      console.log('\nFetching latest ticket...');
      const response = await fetch(`${baseUrl}/rest/v1/tickets?order=created_at.desc&limit=1`, {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      });

      const latestTicket = await response.json();
      console.log('Latest Ticket:', JSON.stringify(latestTicket, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testQuoteAgent().catch(console.error); 