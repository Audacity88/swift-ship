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
  serviceDetails?: {
    type: 'express_freight' | 'standard_freight' | 'eco_freight';
    price: number;
    duration: string;
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
    "Please provide all these details in your response.",

  SERVICE_OPTIONS: (distance: number) => {
    const expressPrice = Math.ceil((distance * 2.5 + 1000) / 100) * 100;
    const standardPrice = Math.ceil((distance * 1.5 + 500) / 100) * 100;
    const ecoPrice = Math.ceil((distance * 1.0 + 300) / 100) * 100;

    return "Based on your shipment details, here are the available service options:\n\n" +
      "1. Express Freight - $" + expressPrice + "\n" +
      "   - Priority handling and expedited transport\n" +
      "   - Estimated delivery: 2-3 business days\n\n" +
      "2. Standard Freight - $" + standardPrice + "\n" +
      "   - Regular service with standard handling\n" +
      "   - Estimated delivery: 4-5 business days\n\n" +
      "3. Eco Freight - $" + ecoPrice + "\n" +
      "   - Cost-effective with consolidated handling\n" +
      "   - Estimated delivery: 6-7 business days\n\n" +
      "Please select your preferred service option (1, 2, or 3):"
  }
};

export class QuoteAgent {
  private debugLogs: string[] = [];

  private log(message: string, ...args: any[]) {
    const logMessage = `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
    this.debugLogs.push(logMessage);
    console.log(logMessage);
  }

  constructor() {}

  private async determineStep(messages: AgentMessage[]): Promise<'initial' | 'package_details' | 'addresses' | 'service_selection' | 'confirmation'> {
    if (messages.length === 0) return 'initial';

    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]?.content || '';
    
    this.log('Determining step from messages:', {
      messageCount: messages.length,
      lastUserMessage,
      lastAssistantMessage
    });

    // Create a system message to help determine the step
    const systemMessage = `You are a shipping quote assistant. Based on the conversation history, analyze where we are in the quote creation process.

First, write a brief natural response about what information we have or need next.
Then on a new line, write exactly one of these step identifiers: STEP:initial, STEP:package_details, STEP:addresses, STEP:service_selection, or STEP:confirmation

Example responses:
"We need to collect the initial shipping details.
STEP:initial"

"Great! They've provided all the package details, now we need addresses.
STEP:addresses"

"We have the addresses, let's show them service options.
STEP:service_selection"

"They've selected a service, let's confirm the quote.
STEP:confirmation"`;

    // Create the conversation context
    const context = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Add the system message
    context.unshift({
      role: 'system',
      content: systemMessage
    });

    try {
      const openai = new OpenAI({
        apiKey: Deno.env.get('OPENAI_API_KEY')
      });

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: context,
        temperature: 0,
        max_tokens: 50
      });

      const response = completion.choices[0].message.content.trim();
      this.log('OpenAI response:', response);
      
      // Extract the step from the response
      const stepMatch = response.match(/STEP:(\w+)/);
      if (stepMatch) {
        const step = stepMatch[1] as 'initial' | 'package_details' | 'addresses' | 'service_selection' | 'confirmation';
        this.log('Extracted step:', step);
        return step;
      }

      // If we can't find a step identifier, use the fallback logic
      this.log('No step identifier found in response, using fallback logic');
      if (userMessages.length === 1 && lastUserMessage.toLowerCase().includes('create')) {
        return 'initial';
      }
      if (lastAssistantMessage.includes('type of shipment')) {
        return 'package_details';
      }
      if (lastAssistantMessage.includes('pickup address')) {
        return 'addresses';
      }
      if (lastAssistantMessage.includes('service option')) {
        return 'service_selection';
      }
      if (lastAssistantMessage.includes('create this shipping quote')) {
        return 'confirmation';
      }
      return 'initial';
    } catch (error) {
      this.log('Error determining step with OpenAI:', error);
      return 'initial';
    }
  }

  private extractPackageDetails(content: string): QuoteState['packageDetails'] | null {
    try {
      this.log('Extracting package details from:', content);
      const contentLower = content.toLowerCase();
      
      // Extract type with more variations
      let type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight' | null = null;
      
      // Log what we're matching against
      this.log('Checking type matches in:', contentLower);
      
      // Check for full truckload variations
      if (contentLower.match(/\b(full.*truck|ftl|full.*load)\b/)) {
        this.log('Matched full truckload pattern');
        type = 'full_truckload';
      } 
      // Check for LTL variations
      else if (contentLower.match(/\b(less.*truck|ltl|less.*load)\b/)) {
        this.log('Matched LTL pattern');
        type = 'less_than_truckload';
      } 
      // Check for container variations
      else if (contentLower.match(/\b(container|sea.*freight)\b/)) {
        this.log('Matched container pattern');
        type = 'sea_container';
      } 
      // Check for bulk variations
      else if (contentLower.match(/\b(bulk)\b/)) {
        this.log('Matched bulk pattern');
        type = 'bulk_freight';
      }

      this.log('Extracted type:', type);
      if (!type) {
        this.log('No type match found in content');
        return null;
      }

      // Extract weight (in tons) with more variations
      const weightMatch = contentLower.match(/(\d+(?:\.\d+)?)\s*(?:ton|tons|t\b|tonnes)/);
      this.log('Weight match:', weightMatch);
      if (!weightMatch) {
        this.log('No weight match found');
        return null;
      }
      const weight = weightMatch[1];

      // Extract volume (in cubic meters) with more variations
      const volumeMatch = contentLower.match(/(\d+(?:\.\d+)?)\s*(?:cubic\s*meter|cubic\s*meters|m3|m³|cbm)/);
      this.log('Volume match:', volumeMatch);
      if (!volumeMatch) {
        this.log('No volume match found');
        return null;
      }
      const volume = volumeMatch[1];

      // Check for hazardous materials with more variations
      const hasHazardousWord = contentLower.includes('hazardous') || contentLower.includes('dangerous');
      const hasNegation = contentLower.includes('no') || contentLower.includes('non') || contentLower.includes('not');
      const hazardous = hasHazardousWord && !hasNegation;

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

      this.log('Successfully extracted package details:', details);
      return details;
    } catch (error) {
      this.log('Error extracting package details:', error);
      return null;
    }
  }

  private extractAddressDetails(content: string): QuoteState['addressDetails'] | null {
    try {
      this.log('Extracting address details from:', content);
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

      this.log('Extracted address details:', addressDetails);
      return addressDetails;
    } catch (error) {
      this.log('Error extracting address details:', error);
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

  private extractServiceSelection(content: string): QuoteState['serviceDetails'] | null {
    try {
      this.log('Extracting service selection from:', content);
      const contentLower = content.toLowerCase();

      let type: 'express_freight' | 'standard_freight' | 'eco_freight' | null = null;
      let price = 0;
      let duration = '';

      // Only match exact service selections
      if (contentLower.match(/^(?:option\s*)?1\s*$/) || contentLower.match(/\b(?:express|express[\s-]freight)\b/)) {
        type = 'express_freight';
        price = 2500;
        duration = '2-3 business days';
      } else if (contentLower.match(/^(?:option\s*)?2\s*$/) || contentLower.match(/\b(?:standard|standard[\s-]freight)\b/)) {
        type = 'standard_freight';
        price = 1500;
        duration = '4-5 business days';
      } else if (contentLower.match(/^(?:option\s*)?3\s*$/) || contentLower.match(/\b(?:eco|eco[\s-]freight)\b/)) {
        type = 'eco_freight';
        price = 1000;
        duration = '6-7 business days';
      }

      if (!type) {
        this.log('No service selection found');
        return null;
      }

      const serviceDetails = {
        type,
        price,
        duration
      };

      this.log('Extracted service details:', serviceDetails);
      return serviceDetails;
    } catch (error) {
      this.log('Error extracting service details:', error);
      return null;
    }
  }

  private calculateDistance(from: { city: string; state: string }, to: { city: string; state: string }): number {
    // This is a simplified distance calculation
    // In a real application, you would use a geocoding service
    const distances: Record<string, Record<string, number>> = {
      'Los Angeles': {
        'New York': 2789,
        'Chicago': 2004,
        'Houston': 1377
      },
      'New York': {
        'Los Angeles': 2789,
        'Chicago': 787,
        'Houston': 1417
      },
      'Chicago': {
        'Los Angeles': 2004,
        'New York': 787,
        'Houston': 940
      },
      'Houston': {
        'Los Angeles': 1377,
        'New York': 1417,
        'Chicago': 940
      }
    };

    return distances[from.city]?.[to.city] || 1000; // Default to 1000 miles if not found
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
    this.debugLogs = []; // Reset debug logs at the start of processing
    this.log('QuoteAgent: Starting process with context:', {
      metadata: context.metadata,
      messageCount: context.messages.length
    });

    // Get the last user message from the context
    const lastUserMessage = context.messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    this.log('Processing user message:', lastUserMessage);

    // Include the current message in the history when determining the step
    const allMessages = context.messages;
    
    // Determine current step from conversation history
    const step = await this.determineStep(allMessages);
    this.log('Determined step:', step);

    let response: string;

    // If we're in the initial state or this is the first message
    if (step === 'initial') {
      response = QUOTE_MESSAGES.START_QUOTE;
    } 
    // If we're waiting for package details, try to extract them
    else if (step === 'package_details') {
      const packageDetails = this.extractPackageDetails(lastUserMessage);
      this.log('Extracted package details:', packageDetails);
      
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
        // Calculate distance and show service options
        const distance = this.calculateDistance(
          { city: addressDetails.pickup.city || '', state: addressDetails.pickup.state || '' },
          { city: addressDetails.delivery.city || '', state: addressDetails.delivery.state || '' }
        );

        response = "Great! I've got your shipping details:\n\n" +
          "Pickup Address:\n" +
          `${addressDetails.pickup.address}, ${addressDetails.pickup.city}` +
          (addressDetails.pickup.state ? `, ${addressDetails.pickup.state}` : '') + "\n\n" +
          "Delivery Address:\n" +
          `${addressDetails.delivery.address}, ${addressDetails.delivery.city}` +
          (addressDetails.delivery.state ? `, ${addressDetails.delivery.state}` : '') + "\n\n" +
          (addressDetails.pickupDateTime ? `Pickup Time: ${addressDetails.pickupDateTime}\n\n` : '') +
          QUOTE_MESSAGES.SERVICE_OPTIONS(distance);
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
    // If we're waiting for service selection
    else if (step === 'service_selection') {
      const serviceDetails = this.extractServiceSelection(lastUserMessage);
      const addressDetails = this.extractAddressDetails(lastUserMessage);
      
      // If they haven't made a selection yet, show the options
      if (!serviceDetails) {
        // Try to get the last known address details to calculate distance
        let lastAddressDetails = addressDetails;
        if (!lastAddressDetails) {
          for (let i = allMessages.length - 1; i >= 0; i--) {
            if (allMessages[i].role === 'user') {
              lastAddressDetails = this.extractAddressDetails(allMessages[i].content);
              if (lastAddressDetails) break;
            }
          }
        }

        if (lastAddressDetails) {
          const distance = this.calculateDistance(
            { city: lastAddressDetails.pickup.city || '', state: lastAddressDetails.pickup.state || '' },
            { city: lastAddressDetails.delivery.city || '', state: lastAddressDetails.delivery.state || '' }
          );
          response = QUOTE_MESSAGES.SERVICE_OPTIONS(distance);
        } else {
          response = "I couldn't find the address details. Let's start over:\n\n" + QUOTE_MESSAGES.START_QUOTE;
        }
      } else {
        response = "Perfect! I've got your service selection:\n\n" +
          `Service: ${serviceDetails.type.replace(/_/g, ' ')}\n` +
          `Price: $${serviceDetails.price}\n` +
          `Estimated Delivery: ${serviceDetails.duration}\n\n` +
          "Would you like me to create this shipping quote for you? (yes/no)";
      }
    }
    // If we're waiting for confirmation
    else if (step === 'confirmation') {
      const confirmation = lastUserMessage.toLowerCase();
      
      // Check if this is the first confirmation message (service selection)
      const isServiceSelection = /^(?:option\s*)?[123]\s*$/.test(confirmation) || 
                               confirmation.includes('express') ||
                               confirmation.includes('standard') ||
                               confirmation.includes('eco');

      if (isServiceSelection) {
        // Extract service details from the selection
        const serviceDetails = this.extractServiceSelection(confirmation);
        if (serviceDetails) {
          response = "Perfect! I've got your service selection:\n\n" +
            `Service: ${serviceDetails.type.replace(/_/g, ' ')}\n` +
            `Price: $${serviceDetails.price}\n` +
            `Estimated Delivery: ${serviceDetails.duration}\n\n` +
            "Would you like me to create this shipping quote for you? (yes/no)";
        } else {
          // If we couldn't extract service details, show options again
          response = "I couldn't understand your service selection. Please choose one of the following options:\n\n" +
            "1. Express Freight\n" +
            "2. Standard Freight\n" +
            "3. Eco Freight";
        }
      } else if (confirmation.includes('yes') || confirmation.includes('yeah') || confirmation.includes('sure')) {
        response = "Great! I'm creating your shipping quote now. You'll receive a confirmation email shortly with all the details.\n\n" +
          "Is there anything else I can help you with?";
      } else if (confirmation.includes('no') || confirmation.includes('nope') || confirmation.includes('cancel')) {
        response = "No problem! Let me know if you'd like to create a different quote or if there's anything else I can help you with.";
      } else {
        response = "I didn't catch that. Would you like me to create this shipping quote for you? Please answer with yes or no.";
      }
    }
    // Default to starting over
    else {
      response = QUOTE_MESSAGES.START_QUOTE;
    }

    this.log('QuoteAgent: Sending response:', response);

    return {
      content: response,
      metadata: {
        agentId: 'quote',
        timestamp: Date.now(),
        userId: context.metadata?.userId,
        token: context.metadata?.token,
        customer: context.metadata?.customer,
        debugLogs: this.debugLogs // Include debug logs in the response
      }
    };
  }
} 