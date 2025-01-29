import { BaseAgent } from '../base-agent.ts';
import type { AgentContext, AgentResponse, AgentEnvironment } from '../types.ts';
import { agentUtils } from '../utils.ts';

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
  addressDetails?: {
    pickup: {
      address: string;
      city?: string;
      state?: string;
    };
    delivery: {
      address: string;
      city?: string;
      state?: string;
    };
    pickupDateTime?: string;
  };
  serviceDetails?: {
    type: 'express_freight' | 'standard_freight' | 'eco_freight';
    price: number;
    duration: string;
  };
}

export class QuoteAgent extends BaseAgent {
  private readonly QUOTE_MESSAGES = {
    START_QUOTE: `I'll help you create a shipping quote. First, I need some details about your shipment:

1. What type of shipment is this?
   - Full Truckload (FTL)
   - Less than Truckload (LTL)
   - Sea Container
   - Bulk Freight

2. What's the total weight in metric tons?
3. What's the total volume in cubic meters?
4. Are there any hazardous materials?

Please provide all these details in your response.`,
    
    ADDRESS_DETAILS: `Thanks! Now I need the pickup and delivery information:

1. What's the complete pickup address? (including city and state)
2. What's the complete delivery address? (including city and state)
3. When would you like the pickup to be scheduled? (date and time)

Please provide all these details in your response.`,

    SERVICE_OPTIONS: (distance: number) => {
      const expressPrice = Math.ceil((distance * 2.5 + 1000) / 100) * 100;
      const standardPrice = Math.ceil((distance * 1.5 + 500) / 100) * 100;
      const ecoPrice = Math.ceil((distance * 1.0 + 300) / 100) * 100;

      return `Based on your shipment details, here are the available service options:

1. Express Freight - $${expressPrice}
   - Priority handling and expedited transport
   - Estimated delivery: 2-3 business days

2. Standard Freight - $${standardPrice}
   - Regular service with standard handling
   - Estimated delivery: 4-5 business days

3. Eco Freight - $${ecoPrice}
   - Cost-effective with consolidated handling
   - Estimated delivery: 6-7 business days

Please select your preferred service option (1, 2, or 3):`;
    }
  };

  constructor(environment: AgentEnvironment = 'server') {
    super({
      agentId: 'quote',
      agentType: 'shipping-quote',
      systemMessage: 'You are a shipping quote specialist focused on helping users create accurate shipping quotes.',
      openAiKey: environment === 'edge' ? Deno.env.get('OPENAI_API_KEY') : undefined,
      supabaseUrl: environment === 'edge' ? Deno.env.get('SUPABASE_URL') : undefined,
      supabaseKey: environment === 'edge' ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : undefined
    }, environment);
  }

  private async extractPackageDetails(message: string): Promise<QuoteState['packageDetails'] | null> {
    try {
      const completion = await this.getCompletion([
        {
          role: 'system',
          content: `Extract shipping package details from the message. Return a JSON object with the following properties:
          {
            "type": "full_truckload" | "less_than_truckload" | "sea_container" | "bulk_freight",
            "weight": string (in metric tons),
            "volume": string (in cubic meters),
            "hazardous": boolean,
            "specialRequirements": string,
            "containerSize": "20ft" | "40ft" | "40ft_hc" (only for sea containers),
            "palletCount": string (only for LTL)
          }
          If the message doesn't contain enough information, return null.`
        },
        {
          role: 'user',
          content: message
        }
      ], 0);

      const details = JSON.parse(completion);
      return details;
    } catch {
      return null;
    }
  }

  private async extractAddressDetails(message: string): Promise<QuoteState['addressDetails'] | null> {
    try {
      const completion = await this.getCompletion([
        {
          role: 'system',
          content: `Extract shipping address details from the message. Return a JSON object with the following properties:
          {
            "pickup": {
              "address": string,
              "city": string,
              "state": string
            },
            "delivery": {
              "address": string,
              "city": string,
              "state": string
            },
            "pickupDateTime": string (ISO format)
          }
          If the message doesn't contain enough information, return null.`
        },
        {
          role: 'user',
          content: message
        }
      ], 0);

      const details = JSON.parse(completion);
      return details;
    } catch {
      return null;
    }
  }

  private async extractServiceSelection(message: string): Promise<QuoteState['serviceDetails'] | null> {
    try {
      const completion = await this.getCompletion([
        {
          role: 'system',
          content: `Extract service selection from the message. Return a JSON object with the following properties:
          {
            "type": "express_freight" | "standard_freight" | "eco_freight",
            "price": number,
            "duration": string
          }
          If the message doesn't contain a clear selection, return null.`
        },
        {
          role: 'user',
          content: message
        }
      ], 0);

      const details = JSON.parse(completion);
      return details;
    } catch {
      return null;
    }
  }

  private async handlePackageDetails(message: string): Promise<string> {
    const details = await this.extractPackageDetails(message);
    if (!details) {
      return "I couldn't understand all the package details. Could you please provide:\n" +
        "1. Type of shipment (FTL, LTL, Sea Container, or Bulk Freight)\n" +
        "2. Total weight in metric tons\n" +
        "3. Total volume in cubic meters\n" +
        "4. Whether there are any hazardous materials";
    }
    return this.QUOTE_MESSAGES.ADDRESS_DETAILS;
  }

  private async handleAddressDetails(message: string): Promise<string> {
    const details = await this.extractAddressDetails(message);
    if (!details) {
      return "I need more information about the addresses. Please provide:\n" +
        "1. Complete pickup address (including city and state)\n" +
        "2. Complete delivery address (including city and state)\n" +
        "3. Preferred pickup date and time";
    }

    // Calculate distance (mock implementation)
    const distance = 1000; // In miles
    return this.QUOTE_MESSAGES.SERVICE_OPTIONS(distance);
  }

  private async handleServiceSelection(message: string, context: AgentContext): Promise<string> {
    const selection = await this.extractServiceSelection(message);
    if (!selection) {
      return "I couldn't understand your service selection. Please choose one of the options (1, 2, or 3).";
    }

    // Get customer info from context
    const customer = context.metadata?.customer;
    const customerInfo = customer ? 
      `\nCustomer: ${customer.name} (${customer.email})` :
      '';

    return `Great! I've created your shipping quote with the following details:${customerInfo}
Service: ${selection.type}
Price: $${selection.price}
Estimated Duration: ${selection.duration}

Would you like to proceed with booking this shipment?`;
  }

  private async handleConfirmation(message: string): Promise<string> {
    const isConfirmed = message.toLowerCase().includes('yes') || 
                       message.toLowerCase().includes('proceed') ||
                       message.toLowerCase().includes('confirm');

    if (isConfirmed) {
      return "Excellent! I'll start processing your booking. Our team will contact you shortly with the final details and next steps.";
    }

    return "No problem! Let me know if you'd like to modify any details or start a new quote.";
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
    try {
      const lastMessage = agentUtils.getLastUserMessage(context);
      const step = await this.determineStep(context.messages);
      const response = await this.handleStep(step, lastMessage, context);

      return {
        content: response,
        metadata: {
          agentId: this.config.agentId,
          timestamp: Date.now(),
          step
        }
      };
    } catch (error) {
      console.error('QuoteAgent error:', error);
      const errorMessage = agentUtils.createErrorMessage(error as Error, this.config.agentId);
      return {
        content: errorMessage.content,
        metadata: errorMessage.metadata
      };
    }
  }

  private async determineStep(messages: AgentContext['messages']): Promise<QuoteState['step']> {
    if (messages.length === 0) return 'initial';

    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]?.content || '';
    
    if (userMessages.length === 1 && lastUserMessage.toLowerCase().includes('create') && lastUserMessage.toLowerCase().includes('quote')) {
      return 'initial';
    }

    if (lastAssistantMessage.includes('type of shipment')) {
      return 'package_details';
    }

    const packageDetails = await this.extractPackageDetails(lastUserMessage);
    if (packageDetails) {
      return 'addresses';
    }

    if (lastAssistantMessage.includes('pickup address')) {
      return 'addresses';
    }

    const addressDetails = await this.extractAddressDetails(lastUserMessage);
    if (addressDetails) {
      return 'service_selection';
    }

    if (lastAssistantMessage.includes('service option')) {
      return 'service_selection';
    }

    const serviceSelection = await this.extractServiceSelection(lastUserMessage);
    if (serviceSelection) {
      return 'confirmation';
    }

    if (lastAssistantMessage.includes('create this shipping quote')) {
      return 'confirmation';
    }

    return 'initial';
  }

  private async handleStep(
    step: QuoteState['step'],
    lastMessage: string,
    context: AgentContext
  ): Promise<string> {
    switch (step) {
      case 'initial':
        return this.QUOTE_MESSAGES.START_QUOTE;

      case 'package_details':
        return this.handlePackageDetails(lastMessage);

      case 'addresses':
        return this.handleAddressDetails(lastMessage);

      case 'service_selection':
        return this.handleServiceSelection(lastMessage, context);

      case 'confirmation':
        return this.handleConfirmation(lastMessage);

      default:
        return this.QUOTE_MESSAGES.START_QUOTE;
    }
  }
} 