import OpenAI from 'https://esm.sh/openai@4'

interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: {
    agentId: string;
    timestamp: number;
    tools?: string[];
    userId?: string;
    token?: string;
    customer?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface AgentContext {
  messages: AgentMessage[];
  metadata?: Record<string, any>;
}

interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
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
    "Please provide all these details in your response."
};

export class QuoteAgent {
  constructor() {}

  private determineStep(messages: AgentMessage[]): 'initial' | 'package_details' | 'addresses' | 'service_selection' | 'confirmation' {
    if (messages.length === 0) return 'initial';

    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]?.content || '';
    
    // If this is the first message and it's asking about creating a quote
    if (userMessages.length === 1 && lastUserMessage.toLowerCase().includes('create') && lastUserMessage.toLowerCase().includes('quote')) {
      return 'initial';
    }

    // If we have a previous message asking for package details
    if (lastAssistantMessage.includes('type of shipment')) {
      return 'package_details';
    }

    // If we have package details in the last user message
    const packageDetails = this.extractPackageDetails(lastUserMessage);
    if (packageDetails) {
      return 'addresses';
    }

    // If we have a previous message asking for address details
    if (lastAssistantMessage.includes('pickup address')) {
      return 'addresses';
    }

    // If we have address details in the last user message
    const addressDetails = this.extractAddressDetails(lastUserMessage);
    if (addressDetails) {
      return 'service_selection';
    }

    return 'initial';
  }

  private extractPackageDetails(content: string): QuoteState['packageDetails'] | null {
    try {
      console.log('Extracting package details from:', content);
      const contentLower = content.toLowerCase();
      
      // Extract type
      let type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight' | null = null;
      if (contentLower.includes('full truckload') || contentLower.includes('ftl')) {
        type = 'full_truckload';
      } else if (contentLower.includes('less than truckload') || contentLower.includes('ltl')) {
        type = 'less_than_truckload';
      } else if (contentLower.includes('container')) {
        type = 'sea_container';
      } else if (contentLower.includes('bulk')) {
        type = 'bulk_freight';
      }

      console.log('Extracted type:', type);
      if (!type) return null;

      // Extract weight (in tons)
      const weightMatch = contentLower.match(/(\d+(?:\.\d+)?)\s*(?:ton|tons|t)/);
      console.log('Weight match:', weightMatch);
      if (!weightMatch) return null;
      const weight = weightMatch[1];

      // Extract volume (in cubic meters)
      const volumeMatch = contentLower.match(/(\d+(?:\.\d+)?)\s*(?:cubic meter|cubic meters|m3|m³)/);
      console.log('Volume match:', volumeMatch);
      if (!volumeMatch) return null;
      const volume = volumeMatch[1];

      // Check for hazardous materials
      const hazardous = contentLower.includes('hazardous') && !contentLower.includes('no hazardous');

      // Determine container size based on volume for sea containers
      let containerSize: '20ft' | '40ft' | '40ft_hc' | undefined;
      if (type === 'sea_container') {
        const volumeNum = parseFloat(volume);
        if (volumeNum <= 33) {
          containerSize = '20ft';
        } else if (volumeNum <= 67) {
          containerSize = '40ft';
        } else {
          containerSize = '40ft_hc';
        }
      }

      const details = {
        type,
        weight,
        volume,
        hazardous,
        specialRequirements: '',
        containerSize,
        palletCount: undefined
      };

      console.log('Extracted package details:', details);
      return details;
    } catch (error) {
      console.error('Error extracting package details:', error);
      return null;
    }
  }

  private extractAddressDetails(content: string): QuoteState['addressDetails'] | null {
    try {
      console.log('Extracting address details from:', content);
      const contentLower = content.toLowerCase();

      // Extract pickup address
      let pickupMatch = content.match(/(?:pickup|from)\s+(?:at|from)?\s*([^,]+),\s*([^,]+),\s*([A-Z]{2})/i);
      if (!pickupMatch) {
        pickupMatch = content.match(/(?:pickup|from)\s+(?:at|from)?\s*([^,]+),\s*([^,]+)/i);
      }
      if (!pickupMatch) return null;

      // Extract delivery address
      let deliveryMatch = content.match(/(?:delivery|to)\s+(?:at|to)?\s*([^,]+),\s*([^,]+),\s*([A-Z]{2})/i);
      if (!deliveryMatch) {
        deliveryMatch = content.match(/(?:delivery|to)\s+(?:at|to)?\s*([^,]+),\s*([^,]+)/i);
      }
      if (!deliveryMatch) return null;

      // Extract pickup date and time
      const dateTimeMatch = content.match(/(?:pickup|schedule|on|at)\s+(?:next\s+)?(\w+)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?(?:\s*[AaPp][Mm])?)/i);

      const addressDetails = {
        pickup: {
          address: pickupMatch[1].trim(),
          city: pickupMatch[2]?.trim(),
          state: pickupMatch[3]?.trim()
        },
        delivery: {
          address: deliveryMatch[1].trim(),
          city: deliveryMatch[2]?.trim(),
          state: deliveryMatch[3]?.trim()
        },
        pickupDateTime: dateTimeMatch ? `${dateTimeMatch[1]} ${dateTimeMatch[2]}` : undefined
      };

      console.log('Extracted address details:', addressDetails);
      return addressDetails;
    } catch (error) {
      console.error('Error extracting address details:', error);
      return null;
    }
  }

  private findLastPackageDetails(messages: AgentMessage[]): QuoteState['packageDetails'] | null {
    // Look through messages in reverse to find the last message with package details
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'user') {
        const details = this.extractPackageDetails(message.content);
        if (details) return details;
      }
    }
    return null;
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
    console.log('QuoteAgent: Starting process with context:', {
      metadata: context.metadata,
      messages: context.messages
    });

    // Get the last user message from the context
    const lastUserMessage = context.messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    console.log('Processing user message:', lastUserMessage);

    // Include the current message in the history when determining the step
    const allMessages = context.messages;
    
    // Determine current step from conversation history
    const step = this.determineStep(allMessages);
    console.log('Determined step:', step);

    let response: string;

    // If we're in the initial state or this is the first message
    if (step === 'initial') {
      response = QUOTE_MESSAGES.START_QUOTE;
    } 
    // If we're waiting for package details, try to extract them
    else if (step === 'package_details') {
      const packageDetails = this.extractPackageDetails(lastUserMessage);
      console.log('Extracted package details:', packageDetails);
      
      if (packageDetails) {
        response = "Great! I've got your package details:\n\n" +
          `Type: ${packageDetails.type.replace(/_/g, ' ')}\n` +
          `Weight: ${packageDetails.weight} tons\n` +
          `Volume: ${packageDetails.volume} cubic meters\n` +
          `Hazardous: ${packageDetails.hazardous ? 'Yes' : 'No'}\n\n` +
          QUOTE_MESSAGES.ADDRESS_DETAILS;
      } else {
        response = "I couldn't understand all the package details. Please provide:\n" +
          "1. Type of shipment (FTL, LTL, Sea Container, or Bulk Freight)\n" +
          "2. Weight in metric tons\n" +
          "3. Volume in cubic meters\n" +
          "4. Whether there are hazardous materials";
      }
    }
    // If we're waiting for addresses
    else if (step === 'addresses') {
      const addressDetails = this.extractAddressDetails(lastUserMessage);
      const packageDetails = this.findLastPackageDetails(allMessages);
      
      if (addressDetails) {
        response = "Great! I've got your shipping details:\n\n" +
          "Pickup Address:\n" +
          `${addressDetails.pickup.address}, ${addressDetails.pickup.city}` +
          (addressDetails.pickup.state ? `, ${addressDetails.pickup.state}` : '') + "\n\n" +
          "Delivery Address:\n" +
          `${addressDetails.delivery.address}, ${addressDetails.delivery.city}` +
          (addressDetails.delivery.state ? `, ${addressDetails.delivery.state}` : '') + "\n\n" +
          (addressDetails.pickupDateTime ? `Pickup Time: ${addressDetails.pickupDateTime}\n\n` : '') +
          "Let me calculate the available shipping options for you...";
      } else if (packageDetails) {
        response = "I'll need the following information to proceed:\n\n" +
          "1. Complete pickup address (including city and state)\n" +
          "2. Complete delivery address (including city and state)\n" +
          "3. Preferred pickup date and time\n\n" +
          "Please provide all these details in your response.";
      } else {
        response = QUOTE_MESSAGES.START_QUOTE;
      }
    }
    // Default to starting over
    else {
      response = QUOTE_MESSAGES.START_QUOTE;
    }

    console.log('QuoteAgent: Sending response:', response);

    return {
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
} 