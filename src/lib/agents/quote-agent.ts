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
    containerSize?: string;
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
  
  PACKAGE_DETAILS: "Great! Let's create your shipping quote. I need some details about your shipment:\n\n" +
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
      '' // Empty system message since it's handled in the edge function
    );
    this.quoteStates = new Map();
  }

  protected async processMessage(message: AgentMessage, context: AgentContext): Promise<string> {
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
        if (content.includes('quote') || content.includes('ship')) {
          state.step = 'package_details';
          return QUOTE_MESSAGES.PACKAGE_DETAILS;
        }
        return QUOTE_MESSAGES.START_QUOTE;

      case 'package_details':
        const packageInfo = this.extractPackageDetails(content);
        if (packageInfo) {
          state.packageDetails = packageInfo;
          state.step = 'addresses';
          return QUOTE_MESSAGES.ADDRESS_DETAILS;
        }
        return "I need more details about your shipment. Please provide:\n1. Type (full truckload, less than truckload, etc.)\n2. Weight in tons\n3. Volume in cubic meters\n4. Whether it contains hazardous materials";

      case 'addresses':
        const addressInfo = this.extractAddressDetails(content);
        if (addressInfo) {
          state.destination = addressInfo;
          const prices = this.calculatePrices(state);
          state.step = 'service_selection';
          return QUOTE_MESSAGES.SERVICE_OPTIONS(
            state.packageDetails!.type,
            parseFloat(state.packageDetails!.weight),
            parseFloat(state.packageDetails!.volume),
            this.calculateDistance(state.destination.pickup.address, state.destination.delivery.address),
            {
              express: prices.express_freight,
              standard: prices.standard_freight,
              eco: prices.eco_freight
            }
          );
        }
        return "Please provide both pickup and delivery addresses, along with the desired pickup time.";

      case 'service_selection':
        const service = this.extractServiceLevel(content);
        if (service) {
          state.selectedService = service;
          const prices = this.calculatePrices(state);
          state.price = prices[service];
          state.step = 'confirmation';
          return QUOTE_MESSAGES.QUOTE_SUMMARY(
            state.packageDetails!.type,
            parseFloat(state.packageDetails!.weight),
            parseFloat(state.packageDetails!.volume),
            this.calculateDistance(state.destination!.pickup.address, state.destination!.delivery.address),
            state.destination!.pickup.address,
            state.destination!.delivery.address,
            state.destination!.pickup.scheduledTime || 'Not specified',
            service.replace('_freight', ''),
            prices[service]
          );
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
            destination: state.destination!,
            selectedService: state.selectedService
          };

          const quote = await this.createQuote(quoteDetails, context.metadata?.token || '');
          if (quote) {
            // Reset state after successful creation
            this.quoteStates.delete(userId);
            return QUOTE_MESSAGES.QUOTE_CREATED(quote.id);
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
    const lastMessage = context.messages[context.messages.length - 1];
    const response = await this.processMessage(lastMessage as AgentMessage, context);
    return {
      role: 'assistant',
      content: response
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

      return {
        type,
        weight,
        volume,
        hazardous: content.toLowerCase().includes('hazardous'),
        specialRequirements: '',
        containerSize: undefined,
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