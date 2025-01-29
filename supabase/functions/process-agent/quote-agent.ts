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
}

export class QuoteAgent {
  constructor() {}

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
      // TODO: Extract and validate address details
      const packageDetails = this.findLastPackageDetails(allMessages);
      if (packageDetails) {
        response = "I'll implement address validation in the next step. For now, let me confirm the package details:\n\n" +
          `Type: ${packageDetails.type.replace(/_/g, ' ')}\n` +
          `Weight: ${packageDetails.weight} tons\n` +
          `Volume: ${packageDetails.volume} cubic meters\n` +
          `Hazardous: ${packageDetails.hazardous ? 'Yes' : 'No'}\n\n` +
          QUOTE_MESSAGES.ADDRESS_DETAILS;
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

  private determineStep(messages: AgentMessage[]): 'initial' | 'package_details' | 'addresses' | 'service_selection' | 'confirmation' {
    if (messages.length === 0) return 'initial';

    const userMessages = messages.filter(m => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
    
    // If this is the first message and it's asking about creating a quote
    if (userMessages.length === 1 && lastUserMessage.toLowerCase().includes('create') && lastUserMessage.toLowerCase().includes('quote')) {
      return 'initial';
    }

    // Check if we have package details in the last response
    const lastAssistantMessage = messages
      .filter(m => m.role === 'assistant')
      .pop()?.content || '';

    if (lastAssistantMessage.includes(QUOTE_MESSAGES.ADDRESS_DETAILS)) {
      return 'addresses';
    }

    // If we have package details in the last user message, move to addresses
    const packageDetails = this.extractPackageDetails(lastUserMessage);
    if (packageDetails) {
      return 'addresses';
    }

    // If we have a previous message asking for package details, stay in package_details
    if (messages.some(m => m.role === 'assistant' && m.content.includes('Type of shipment'))) {
      return 'package_details';
    }

    return 'initial';
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
} 