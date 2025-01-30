import { QuoteAgent } from '../supabase/functions/quote-agent/sample-quote-agent.js';
import { load } from 'https://deno.land/std/dotenv/mod.ts';

// Load environment variables from .env.local
const env = await load({ envPath: '.env.local' });

async function testCreateTicket() {
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const quoteAgent = new QuoteAgent(baseUrl);

  // Match the format from page.tsx
  const testQuoteDetails = {
    isQuote: true,
    packageDetails: {
      type: 'full_truckload' as const,
      weight: '1',
      volume: '1',
      hazardous: false,
      specialRequirements: '',
      palletCount: '1'
    },
    destination: {
      from: {
        address: '111 Jenkins, Houston, TX 77003 USA',
        coordinates: {
          latitude: 29.7463365,
          longitude: -95.3314555
        },
        placeDetails: {
          city: 'Houston',
          state: 'Texas',
          country: 'United States',
          latitude: 29.7463365,
          longitude: -95.3314555,
          stateCode: 'TX',
          postalCode: '77003',
          coordinates: {
            latitude: 29.7463365,
            longitude: -95.3314555
          },
          countryCode: 'US',
          countryFlag: '🇺🇸',
          formattedAddress: '111 Jenkins St, Houston, TX 77003 US'
        },
        formattedAddress: '111 Jenkins St, Houston, TX 77003 US'
      },
      to: {
        address: '222 York Street, Houston, TX 77003 USA',
        coordinates: {
          latitude: 29.7495867664216,
          longitude: -95.3393538136756
        },
        placeDetails: {
          city: 'Houston',
          state: 'Texas',
          country: 'United States',
          latitude: 29.7495867664216,
          longitude: -95.3393538136756,
          stateCode: 'TX',
          postalCode: '77003',
          coordinates: {
            latitude: 29.7495867664216,
            longitude: -95.3393538136756
          },
          countryCode: 'US',
          countryFlag: '🇺🇸',
          formattedAddress: '222 York St, Houston, TX 77003 US'
        },
        formattedAddress: '222 York St, Houston, TX 77003 US'
      },
      pickupDate: '2025-02-05',
      pickupTimeSlot: 'morning_2'
    },
    selectedService: 'express_freight',
    estimatedPrice: 2400,
    estimatedDelivery: '2025-02-05'
  };

  const testMetadata = {
    customer: {
      id: '8a7923a3-87da-4ad7-91c2-92504d7b31d1',
      name: 'Dan Gilles',
      email: 'dangilles@outlook.com'
    }
  };

  console.log('Creating test ticket...');
  try {
    const ticketData = {
      title: `Shipping Quote - ${testQuoteDetails.selectedService}`,
      description: `
Package Details:
- Type: ${testQuoteDetails.packageDetails.type}
- Weight: ${testQuoteDetails.packageDetails.weight} tons
- Volume: ${testQuoteDetails.packageDetails.volume} cubic meters
- Hazardous: ${testQuoteDetails.packageDetails.hazardous ? 'Yes' : 'No'}
- Pallet Count: ${testQuoteDetails.packageDetails.palletCount}

Pickup Address:
${testQuoteDetails.destination.from.formattedAddress}
Pickup Date: ${testQuoteDetails.destination.pickupDate}
Pickup Time: ${testQuoteDetails.destination.pickupTimeSlot}

Delivery Address:
${testQuoteDetails.destination.to.formattedAddress}

Service Details:
- Service Type: ${testQuoteDetails.selectedService}
- Estimated Price: $${testQuoteDetails.estimatedPrice}
- Estimated Delivery: ${testQuoteDetails.estimatedDelivery}
      `.trim(),
      priority: 'medium',
      customer_id: testMetadata.customer.id,
      status: 'open',
      type: 'task',
      source: 'web',
      metadata: testQuoteDetails
    };

    console.log('Request URL:', `${baseUrl}/rest/v1/tickets`);
    console.log('Request Headers:', {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...',
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10)}...`
    });
    console.log('Request Body:', JSON.stringify(ticketData, null, 2));

    // Make the API call directly to match test-agent.ts pattern
    const response = await fetch(`${baseUrl}/rest/v1/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(ticketData)
    });

    const responseText = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries([...response.headers]));
    console.log('Response Text:', responseText);

    try {
      const responseData = JSON.parse(responseText);
      console.log('Response Data:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.error('Error parsing response JSON:', parseError);
    }

    // Fetch the latest ticket to verify creation
    console.log('\nFetching latest ticket...');
    const getResponse = await fetch(`${baseUrl}/rest/v1/tickets?order=created_at.desc&limit=1`, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const latestTicket = await getResponse.json();
    console.log('Latest Ticket:', JSON.stringify(latestTicket, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testCreateTicket().catch(console.error); 