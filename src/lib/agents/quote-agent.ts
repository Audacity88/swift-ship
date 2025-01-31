import { BaseAgent, AgentContext } from './base-agent';
import { QuoteRequest, PackageDetails, QuoteDestination } from '@/types/quote';
import { TicketPriority, TicketStatus } from '@/types/ticket';

interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: AgentMessageMetadata;
}

interface AgentMessageMetadata {
  agentId: string;
  timestamp: number;
  tools?: string[];
  userId?: string;
  token?: string;
  content?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

interface QuoteState {
  step: 'initial' | 'package_details' | 'addresses' | 'service_selection' | 'confirmation';
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  packageDetails?: {
    type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight';
    weight: string;
    volume: string;
    hazardous: boolean;
    specialRequirements: string;
    containerSize?: '20ft' | '40ft' | '40ft_hc';
    palletCount?: string;
  };
  destination?: {
    pickup: {
      address: string;
      city: string;
      state: string;
      scheduledTime?: string;
    };
    delivery: {
      address: string;
      city: string;
      state: string;
      scheduledTime?: string;
    };
  };
  selectedService?: 'standard_freight' | 'express_freight' | 'eco_freight';
  price?: number;
}

const SERVICE_RATES = {
  express_freight: {
    basePrice: 2000,
    perKm: 2.5,
    perM3: 10,
    perTon: 20,
    perPallet: 15,
    speedFactor: 1.5,
    rushFactor: 1.2,
    description: 'Express Freight (1-2 Business Days)',
  },
  standard_freight: {
    basePrice: 1500,
    perKm: 1.8,
    perM3: 8,
    perTon: 15,
    perPallet: 12,
    speedFactor: 1.0,
    rushFactor: 1.0,
    description: 'Standard Freight (3-5 Business Days)',
  },
  eco_freight: {
    basePrice: 1000,
    perKm: 1.2,
    perM3: 6,
    perTon: 12,
    perPallet: 10,
    speedFactor: 0.8,
    rushFactor: 0.8,
    description: 'Eco Freight (5-7 Business Days)',
  }
};

interface ExtendedAgentMessage extends Omit<AgentMessage, 'content'> {
  content: string;
  metadata: AgentMessageMetadata;
}

const QUOTE_MESSAGES = {
  START_QUOTE: "I'll help you create a shipping quote. First, I need some details about your shipment:\n\n" +
    "1. What type of shipment is this?\n" +
    "   - Full Truckload (FTL)\n" +
    "   - Less than Truckload (LTL)\n" +
    "   - Sea Container\n" +
    "   - Bulk Freight\n\n" +
    "2. What's the total weight in metric tons?\n" +
    "3. What's the total volume in cubic meters?\n" +
    "4. Are there any hazardous materials?\n\n" +
    "Please provide all these details in your response.",
  
  ADDRESS_DETAILS: "Thanks! Now I need the pickup and delivery information:\n\n" +
    "1. What's the complete pickup address? (including city and state)\n" +
    "2. What's the complete delivery address? (including city and state)\n" +
    "3. When would you like the pickup to be scheduled? (date and time)\n\n" +
    "Please provide all these details in your response.",

  SERVICE_OPTIONS: (type: string, weight: number, volume: number, distance: number, prices: { express: number; standard: number; eco: number }) => 
    `Based on your shipment details:\n\n` +
    `📦 ${type.replace(/_/g, ' ').toUpperCase()}\n` +
    `⚖️ Weight: ${weight} tons\n` +
    `📐 Volume: ${volume} m³\n` +
    `🚚 Distance: ${Math.round(distance)} km\n\n` +
    `Available service options:\n\n` +
    `1. Express Freight (1-2 Business Days)\n   Price: $${prices.express.toLocaleString()}\n\n` +
    `2. Standard Freight (3-5 Business Days)\n   Price: $${prices.standard.toLocaleString()}\n\n` +
    `3. Eco Freight (5-7 Business Days)\n   Price: $${prices.eco.toLocaleString()}\n\n` +
    `Which service level would you like to select? Please type 'express', 'standard', or 'eco' to choose your preferred service.`,

  QUOTE_SUMMARY: (type: string, weight: number, volume: number, distance: number, from: string, to: string, pickupDate: string, service: string, price: number) =>
    `Great choice! Here's a summary of your quote:\n\n` +
    `📦 Shipment Type: ${type.replace(/_/g, ' ').toUpperCase()}\n` +
    `⚖️ Weight: ${weight} tons\n` +
    `📐 Volume: ${volume} m³\n` +
    `🚚 Distance: ${Math.round(distance)} km\n\n` +
    `📍 Pickup: ${from}\n` +
    `📅 Date: ${pickupDate}\n\n` +
    `📍 Delivery: ${to}\n\n` +
    `🚛 Service: ${service.charAt(0).toUpperCase() + service.slice(1)} Freight\n` +
    `💰 Price: $${price.toLocaleString()}\n\n` +
    `Would you like me to create this quote? (Yes/No)`,

  QUOTE_CREATED: (quoteId: string) =>
    `✅ Quote created successfully!\n\n` +
    `Quote ID: ${quoteId}\n\n` +
    `Our team will review your quote and you'll receive a confirmation email shortly. You can also track the status of your quote in your account dashboard.`,

  QUOTE_CANCELLED: "Quote creation cancelled. Let me know if you'd like to start over or need anything else."
};

export class QuoteAgent extends BaseAgent {
  private quoteStates: Map<string, QuoteState>;

  constructor() {
    super(
      'quote',
      'quote',
      `You are a shipping quote agent that MUST use these EXACT message templates without any modification:

      START_QUOTE = "${QUOTE_MESSAGES.START_QUOTE}"

      ADDRESS_DETAILS = "${QUOTE_MESSAGES.ADDRESS_DETAILS}"

      SERVICE_OPTIONS template (fill in the variables):
      Based on your shipment details:

      📦 [TYPE]
      ⚖️ Weight: [WEIGHT] tons
      📐 Volume: [VOLUME] m³
      🚚 Distance: [DISTANCE] km

      Available service options:

      1. Express Freight (1-2 Business Days)
         Price: $[EXPRESS_PRICE]

      2. Standard Freight (3-5 Business Days)
         Price: $[STANDARD_PRICE]

      3. Eco Freight (5-7 Business Days)
         Price: $[ECO_PRICE]

      Which service level would you like to select? Please type 'express', 'standard', or 'eco' to choose your preferred service.

      QUOTE_SUMMARY template (fill in the variables):
      Great choice! Here's a summary of your quote:

      📦 Shipment Type: [TYPE]
      ⚖️ Weight: [WEIGHT] tons
      📐 Volume: [VOLUME] m³
      🚚 Distance: [DISTANCE] km

      📍 Pickup: [FROM]
      📅 Date: [PICKUP_DATE]

      📍 Delivery: [TO]

      🚛 Service: [SERVICE] Freight
      💰 Price: $[PRICE]

      Would you like me to create this quote? (Yes/No)

      QUOTE_CREATED = "✅ Quote created successfully! Quote ID: [ID]. Our team will review your quote and you'll receive a confirmation email shortly."

      QUOTE_CANCELLED = "${QUOTE_MESSAGES.QUOTE_CANCELLED}"

      YOU MUST USE THESE EXACT TEMPLATES. DO NOT MODIFY THEM OR ADD YOUR OWN TEXT.
      DO NOT USE MARKDOWN OR ANY OTHER FORMATTING UNLESS IT'S IN THE TEMPLATE.
      MAINTAIN ALL EMOJIS AND FORMATTING EXACTLY AS SHOWN.`
    );
    this.quoteStates = new Map();
  }

  protected async processMessage(message: AgentMessage, context: AgentContext): Promise<string> {
    console.log('QuoteAgent: Processing message:', { content: message.content, step: this.getQuoteState(context.metadata?.userId || 'default').step });
    
    const userId = context.metadata?.userId || 'default';
    const state = this.getQuoteState(userId);
    const content = message.content.toLowerCase();

    // Extract customer info from metadata
    const customer = context.metadata?.customer;
    if (customer && !state.customer) {
      state.customer = customer;
    }

    // Handle state transitions
    switch (state.step) {
      case 'initial':
        console.log('QuoteAgent: Initial step, returning START_QUOTE message');
        state.step = 'package_details';
        return QUOTE_MESSAGES.START_QUOTE;

      case 'package_details':
        const packageInfo = this.extractPackageDetails(content);
        if (packageInfo) {
          state.packageDetails = packageInfo;
          state.step = 'addresses';
          return QUOTE_MESSAGES.ADDRESS_DETAILS;
        }
        return QUOTE_MESSAGES.START_QUOTE;

      case 'addresses':
        const addressInfo = this.extractAddressDetails(content);
        if (addressInfo) {
          state.destination = addressInfo;
          const prices = this.calculatePrices(state);
          state.step = 'service_selection';
          const distance = this.calculateDistance(addressInfo.pickup.address, addressInfo.delivery.address);
          return `Based on your shipment details:

📦 ${state.packageDetails!.type.replace(/_/g, ' ').toUpperCase()}
⚖️ Weight: ${state.packageDetails!.weight} tons
📐 Volume: ${state.packageDetails!.volume} m³
🚚 Distance: ${Math.round(distance)} km

Available service options:

1. Express Freight (1-2 Business Days)
   Price: $${prices.express_freight.toLocaleString()}

2. Standard Freight (3-5 Business Days)
   Price: $${prices.standard_freight.toLocaleString()}

3. Eco Freight (5-7 Business Days)
   Price: $${prices.eco_freight.toLocaleString()}

Which service level would you like to select? Please type 'express', 'standard', or 'eco' to choose your preferred service.`;
        }
        return QUOTE_MESSAGES.ADDRESS_DETAILS;

      case 'service_selection':
        const service = this.extractServiceLevel(content);
        if (service) {
          state.selectedService = service;
          const prices = this.calculatePrices(state);
          state.price = prices[service];
          state.step = 'confirmation';
          const distance = this.calculateDistance(state.destination!.pickup.address, state.destination!.delivery.address);
          return `Great choice! Here's a summary of your quote:

📦 Shipment Type: ${state.packageDetails!.type.replace(/_/g, ' ').toUpperCase()}
⚖️ Weight: ${state.packageDetails!.weight} tons
📐 Volume: ${state.packageDetails!.volume} m³
🚚 Distance: ${Math.round(distance)} km

📍 Pickup: ${state.destination!.pickup.address}
📅 Date: ${state.destination!.pickup.scheduledTime || 'Not specified'}

📍 Delivery: ${state.destination!.delivery.address}

🚛 Service: ${service.replace('_freight', '')} Freight
💰 Price: $${prices[service].toLocaleString()}

Would you like me to create this quote? (Yes/No)`;
        }
        return "Please select a service level: 'express', 'standard', or 'eco'.";

      case 'confirmation':
        if (content.includes('yes')) {
          if (!state.customer) {
            return "I need your customer information to create the quote. Please log in or provide your details.";
          }

          const quoteDetails = {
            customer: state.customer,
            packageDetails: state.packageDetails!,
            destination: {
              from: {
                address: state.destination!.pickup.address,
                coordinates: { latitude: 0, longitude: 0 },
              },
              to: {
                address: state.destination!.delivery.address,
                coordinates: { latitude: 0, longitude: 0 },
              },
              pickupDate: state.destination!.pickup.scheduledTime || new Date().toISOString(),
              pickupTimeSlot: state.destination!.pickup.scheduledTime || ''
            },
            selectedService: state.selectedService
          };

          const quote = await this.createQuote(quoteDetails, context.metadata?.token || '');
          if (quote) {
            this.quoteStates.delete(userId);
            return `✅ Quote created successfully!

Quote ID: ${quote.id}

Our team will review your quote and you'll receive a confirmation email shortly. You can also track the status of your quote in your account dashboard.`;
          }
          return "I encountered an error while creating your quote. Please try again or contact our support team.";
        } else if (content.includes('no')) {
          this.quoteStates.delete(userId);
          return QUOTE_MESSAGES.QUOTE_CANCELLED;
        }
        return "Please confirm if you'd like to create this quote (yes/no).";

      default:
        return "I'm not sure where we are in the quote process. Would you like to start over?";
    }
  }

  public async process(context: AgentContext): Promise<AgentMessage> {
    console.log('QuoteAgent: Starting process with metadata:', {
      userId: context.metadata?.userId,
      agentType: context.metadata?.agentType,
      messageCount: context.messages.length
    });

    const lastMessage = context.messages[context.messages.length - 1];
    
    // For the initial message, bypass the LLM and return our template directly
    const userId = context.metadata?.userId || 'default';
    const state = this.getQuoteState(userId);
    
    console.log('QuoteAgent: Current state:', { 
      step: state.step,
      hasCustomer: !!state.customer,
      hasPackageDetails: !!state.packageDetails,
      hasDestination: !!state.destination,
      selectedService: state.selectedService
    });

    let response: string;
    if (state.step === 'initial') {
      console.log('QuoteAgent: Initial step - returning START_QUOTE template');
      state.step = 'package_details';
      response = QUOTE_MESSAGES.START_QUOTE;
    } else {
      response = await this.processMessage(lastMessage as AgentMessage, context);
    }

    console.log('QuoteAgent: Sending response:', { response: response.slice(0, 100) + '...' });

    return {
      role: 'assistant',
      content: response,
      metadata: {
        agentId: 'quote',
        timestamp: Date.now(),
        userId: context.metadata?.userId,
        token: context.metadata?.token,
        customer: context.metadata?.customer
      }
    };
  }

  private getQuoteState(userId: string): QuoteState {
    if (!this.quoteStates.has(userId)) {
      this.quoteStates.set(userId, { step: 'initial' });
    }
    return this.quoteStates.get(userId)!;
  }

  private async lookupQuote(identifier: string, token: string): Promise<QuoteRequest | null> {
    try {
      const response = await fetch(`/api/tickets?search=${encodeURIComponent(identifier)}&type=quote`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }

      const { data: tickets } = await response.json();
      const quote = tickets?.[0];

      if (!quote) {
        return null;
      }

      return {
        id: quote.id,
        title: quote.title,
        status: quote.status,
        customer: quote.customer,
        metadata: quote.metadata,
        created_at: quote.created_at
      };
    } catch (error) {
      console.error('Error looking up quote:', error);
      return null;
    }
  }

  private async createQuote(details: {
    customer: { id: string; name: string; email: string };
    packageDetails: PackageDetails;
    destination: QuoteDestination;
    selectedService?: 'standard_freight' | 'express_freight' | 'eco_freight';
  }, token: string): Promise<QuoteRequest | null> {
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Shipping Quote - ${details.customer.name}`,
          description: `Quote request for shipping from ${details.destination.from.address} to ${details.destination.to.address}`,
          priority: TicketPriority.MEDIUM,
          customerId: details.customer.id,
          type: 'quote',
          metadata: {
            packageDetails: details.packageDetails,
            destination: {
              from: {
                address: details.destination.from.address,
                coordinates: details.destination.from.coordinates || {
                  latitude: 0,
                  longitude: 0
                },
                formattedAddress: details.destination.from.formattedAddress,
                placeDetails: details.destination.from.placeDetails
              },
              to: {
                address: details.destination.to.address,
                coordinates: details.destination.to.coordinates || {
                  latitude: 0,
                  longitude: 0
                },
                formattedAddress: details.destination.to.formattedAddress,
                placeDetails: details.destination.to.placeDetails
              },
              pickupDate: details.destination.pickupDate,
              pickupTimeSlot: details.destination.pickupTimeSlot
            },
            selectedService: details.selectedService,
            quotedPrice: details.selectedService ? this.calculatePrices(details as any)[details.selectedService] : undefined
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create quote');
      }

      const { data: ticket } = await response.json();

      return {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        customer: details.customer,
        metadata: ticket.metadata,
        created_at: ticket.created_at
      };
    } catch (error) {
      console.error('Error creating quote:', error);
      return null;
    }
  }

  private extractPackageDetails(content: string): QuoteState['packageDetails'] | null {
    try {
      const type = content.toLowerCase().includes('full truckload') ? 'full_truckload' :
                   content.toLowerCase().includes('less than') ? 'less_than_truckload' :
                   content.toLowerCase().includes('container') ? 'sea_container' :
                   content.toLowerCase().includes('bulk') ? 'bulk_freight' : null;

      if (!type) return null;

      // Extract weight (assuming it's in tons)
      const weightMatch = content.match(/(\d+(?:\.\d+)?)\s*(ton|t|tons)/i);
      if (!weightMatch) return null;
      const weight = weightMatch[1];

      // Extract volume (assuming it's in cubic meters)
      const volumeMatch = content.match(/(\d+(?:\.\d+)?)\s*(cubic meter|m3|m³|cubic meters)/i);
      if (!volumeMatch) return null;
      const volume = volumeMatch[1];

      // Extract container size if sea container
      let containerSize: '20ft' | '40ft' | '40ft_hc' | undefined;
      if (type === 'sea_container') {
        if (content.includes('20ft')) containerSize = '20ft';
        else if (content.includes('40ft high cube') || content.includes('40ft hc')) containerSize = '40ft_hc';
        else if (content.includes('40ft')) containerSize = '40ft';
      }

      return {
        type,
        weight,
        volume,
        hazardous: content.toLowerCase().includes('hazardous'),
        specialRequirements: '',
        containerSize,
        palletCount: undefined
      };
    } catch (error) {
      console.error('Error extracting package details:', error);
      return null;
    }
  }

  private extractAddressDetails(content: string): QuoteState['destination'] | null {
    try {
      const fromMatch = content.match(/from\s+([^.]+?)(?=\s+to\s+|$)/i);
      const toMatch = content.match(/to\s+([^.]+?)(?=\s+pickup|$)/i);
      const timeMatch = content.match(/pickup\s+([^.]+?)(?=\s+at\s+|$)/i);
      const atMatch = content.match(/at\s+(\d{1,2}(?::\d{2})?\s*[ap]m)/i);

      if (!fromMatch || !toMatch) return null;

      const fromAddress = fromMatch[1].trim();
      const toAddress = toMatch[1].trim();
      
      // Extract city and state from addresses
      const fromParts = fromAddress.split(',').map(part => part.trim());
      const toParts = toAddress.split(',').map(part => part.trim());

      const scheduledTime = timeMatch && atMatch ? 
        `${timeMatch[1]} ${atMatch[1]}` : 
        new Date().toISOString();

      return {
        pickup: {
          address: fromParts[0],
          city: fromParts[1] || '',
          state: fromParts[2] || '',
          scheduledTime
        },
        delivery: {
          address: toParts[0],
          city: toParts[1] || '',
          state: toParts[2] || '',
          scheduledTime: undefined
        }
      };
    } catch (error) {
      console.error('Error extracting address details:', error);
      return null;
    }
  }

  private extractServiceLevel(content: string): QuoteState['selectedService'] | null {
    const normalizedContent = content.toLowerCase();
    if (normalizedContent.includes('express')) return 'express_freight';
    if (normalizedContent.includes('standard')) return 'standard_freight';
    if (normalizedContent.includes('eco') || normalizedContent.includes('economy')) return 'eco_freight';
    return null;
  }

  private calculatePrices(state: QuoteState): { express_freight: number; standard_freight: number; eco_freight: number } {
    if (!state.packageDetails || !state.destination) {
      return {
        express_freight: 0,
        standard_freight: 0,
        eco_freight: 0
      };
    }

    const distance = this.calculateDistance(
      state.destination.pickup.address,
      state.destination.delivery.address
    );

    const weight = parseFloat(state.packageDetails.weight) || 0;
    const volume = parseFloat(state.packageDetails.volume) || 0;
    const palletCount = parseInt(state.packageDetails.palletCount || '0') || 0;
    const isRushDelivery = distance < 100;

    const calculatePrice = (rate: typeof SERVICE_RATES.express_freight) => {
      // Base calculation
      let baseAmount = rate.basePrice;
      
      // Add distance cost (with minimum)
      baseAmount += Math.max(100, distance) * rate.perKm;
      
      // Add volume and weight costs
      baseAmount += volume * rate.perM3;
      baseAmount += weight * rate.perTon;
      
      // Add pallet costs if applicable
      if (palletCount > 0) {
        baseAmount += palletCount * rate.perPallet;
      }
      
      // Apply speed factor
      baseAmount *= rate.speedFactor;
      
      // Apply rush factor if applicable
      if (isRushDelivery) {
        baseAmount *= rate.rushFactor;
      }
      
      // Round to nearest 100
      return Math.ceil(baseAmount / 100) * 100;
    };

    return {
      express_freight: calculatePrice(SERVICE_RATES.express_freight),
      standard_freight: calculatePrice(SERVICE_RATES.standard_freight),
      eco_freight: calculatePrice(SERVICE_RATES.eco_freight)
    };
  }

  private calculateDistance(from: string, to: string): number {
    // This is a simplified distance calculation
    // In a real implementation, you would use a proper geocoding and routing service
    const cities: { [key: string]: [number, number] } = {
      'los angeles': [34.0522, -118.2437],
      'new york': [40.7128, -74.0060],
      'chicago': [41.8781, -87.6298],
      'houston': [29.7604, -95.3698],
      'phoenix': [33.4484, -112.0740]
    };

    const fromCity = Object.entries(cities).find(([city]) => 
      from.toLowerCase().includes(city))?.[1];
    const toCity = Object.entries(cities).find(([city]) => 
      to.toLowerCase().includes(city))?.[1];

    if (!fromCity || !toCity) return 1000; // Default distance if cities not found

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(toCity[0] - fromCity[0]);
    const dLon = this.toRad(toCity[1] - fromCity[1]);
    const lat1 = this.toRad(fromCity[0]);
    const lat2 = this.toRad(toCity[0]);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }
} 