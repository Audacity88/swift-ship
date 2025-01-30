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

interface AddressDetails {
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
}

interface QuoteState {
  step: 'initial' | 'package_details' | 'addresses' | 'service_selection' | 'confirmation';
  packageDetails?: {
    type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight';
    weight: string;
    volume: string;
    hazardous: boolean;
    specialRequirements: string;
    containerSize?: '20ft' | '40ft' | '40ft_hc';
    palletCount?: string;
  };
  addressDetails?: AddressDetails;
  serviceDetails?: {
    type: 'express_freight' | 'standard_freight' | 'eco_freight';
    price: number;
    duration: string;
  };
}

export class QuoteAgent {
  private debugLogs: string[] = [];
  private baseUrl: string;
  private context: AgentContext | null = null;

  private readonly QUOTE_MESSAGES = {
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

    SERVICE_OPTIONS: (metadata: any) => {
      if (!metadata) {
        return "I apologize, but I need the shipping details to calculate service options. Let's start over:\n\n" + 
               "1. What type of shipment is this? (FTL, LTL, Sea Container, or Bulk Freight)\n" +
               "2. What's the total weight in metric tons?\n" +
               "3. What's the total volume in cubic meters?\n" +
               "4. Are there any hazardous materials?";
      }

      const route = metadata.route;
      if (!route) {
        return "I need the pickup and delivery addresses to calculate service options. Please provide:\n\n" +
               "1. Complete pickup address (including city and state)\n" +
               "2. Complete delivery address (including city and state)\n" +
               "3. Preferred pickup date and time";
      }

      return `Based on your shipping details:\n\n` +
        `Pickup: ${metadata.destination.from.formattedAddress}\n` +
        `Delivery: ${metadata.destination.to.formattedAddress}\n` +
        `Distance: ${route.distance.kilometers.toFixed(1)} km\n\n` +
        `Here are your available service options:\n\n` +
        `1. Express Freight - $${metadata.expressPrice}\n` +
        `   - Priority handling and expedited transport\n` +
        `   - Estimated delivery: ${metadata.expressDelivery}\n\n` +
        `2. Standard Freight - $${metadata.standardPrice}\n` +
        `   - Regular service with standard handling\n` +
        `   - Estimated delivery: ${metadata.standardDelivery}\n\n` +
        `3. Eco Freight - $${metadata.ecoPrice}\n` +
        `   - Cost-effective with consolidated handling\n` +
        `   - Estimated delivery: ${metadata.ecoDelivery}\n\n` +
        `Please select your preferred service option (1, 2, or 3):`;
    }
  };

  constructor(baseUrl: string = 'https://dkrhdxqqkgutrnvsfhxi.supabase.co') {
    this.baseUrl = baseUrl;
  }

  private log(message: string, ...args: any[]) {
    const logMessage = `${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`;
    this.debugLogs.push(logMessage);
    console.log(logMessage);
  }

  private async collectQuoteDetails(messages: AgentMessage[]): Promise<{
    packageDetails: QuoteState['packageDetails'];
    addressDetails: QuoteState['addressDetails'];
    serviceDetails: QuoteState['serviceDetails'];
  } | null> {
    try {
      const packageDetails = this.findLastPackageDetails(messages);
      const addressDetails = this.findLastAddressDetails(messages);
      const serviceDetails = this.findLastServiceSelection(messages);

      if (!packageDetails || !addressDetails || !serviceDetails) {
        this.log('Missing required details for quote:', {
          hasPackage: !!packageDetails,
          hasAddress: !!addressDetails,
          hasService: !!serviceDetails
        });
        return null;
      }

      return {
        packageDetails,
        addressDetails,
        serviceDetails
      };
    } catch (error) {
      this.log('Error collecting quote details:', error);
      return null;
    }
  }

  public async createTicketDirect(
    quoteDetails: {
      packageDetails: QuoteState['packageDetails'];
      addressDetails: QuoteState['addressDetails'];
      serviceDetails: QuoteState['serviceDetails'];
    },
    metadata: {
      customer?: { id: string; name: string; email: string };
      token?: string;
      quote: {
        isQuote: boolean;
        destination: {
          from: {
            address: string;
            coordinates: {
              latitude: number;
              longitude: number;
            };
            placeDetails: {
              city: string;
              state: string;
              country: string;
              latitude: number;
              longitude: number;
              stateCode: string;
              postalCode: string;
              coordinates: {
                latitude: number;
                longitude: number;
              };
              countryCode: string;
              countryFlag: string;
              formattedAddress: string;
            };
            formattedAddress: string;
          };
          to: {
            address: string;
            coordinates: {
              latitude: number;
              longitude: number;
            };
            placeDetails: {
              city: string;
              state: string;
              country: string;
              latitude: number;
              longitude: number;
              stateCode: string;
              postalCode: string;
              coordinates: {
                latitude: number;
                longitude: number;
              };
              countryCode: string;
              countryFlag: string;
              formattedAddress: string;
            };
            formattedAddress: string;
          };
          pickupDate: string;
          pickupTimeSlot: string;
        };
        packageDetails: {
          type: string;
          volume: string;
          weight: string;
          hazardous: boolean;
          palletCount?: string;
          specialRequirements: string;
        };
        selectedService: string;
        estimatedPrice: number;
        estimatedDelivery: string;
      };
    }
  ): Promise<{ success: boolean; error?: string; ticket?: any }> {
    try {
      const { quote } = metadata;
      
      // Format the ticket data using the quote metadata
      const ticketData = {
        title: `New Quote Request - ${quote.selectedService.replace(/_/g, ' ')}`,
        description: `
Package Details:
- Type: ${quote.packageDetails.type.replace(/_/g, ' ')}
- Weight: ${quote.packageDetails.weight} tons
- Volume: ${quote.packageDetails.volume} cubic meters
- Hazardous: ${quote.packageDetails.hazardous ? 'Yes' : 'No'}
${quote.packageDetails.palletCount ? `- Pallet Count: ${quote.packageDetails.palletCount}` : ''}
${quote.packageDetails.specialRequirements ? `- Special Requirements: ${quote.packageDetails.specialRequirements}` : ''}

Pickup Address:
${quote.destination.from.formattedAddress}
Pickup Time: ${quote.destination.pickupDate} (${quote.destination.pickupTimeSlot.replace(/_/g, ' ')})

Delivery Address:
${quote.destination.to.formattedAddress}

Service Details:
- Service Type: ${quote.selectedService.replace(/_/g, ' ')}
- Estimated Price: $${quote.estimatedPrice}
- Estimated Delivery: ${quote.estimatedDelivery}
        `.trim(),
        priority: 'medium',
        customer_id: metadata.customer?.id,
        status: 'open',
        type: 'task',
        source: 'web',
        metadata: {
          quote: {
            isQuote: true,
            destination: {
              from: {
                address: quote.destination.from.address,
                coordinates: quote.destination.from.coordinates,
                placeDetails: quote.destination.from.placeDetails,
                formattedAddress: quote.destination.from.formattedAddress
              },
              to: {
                address: quote.destination.to.address,
                coordinates: quote.destination.to.coordinates,
                placeDetails: quote.destination.to.placeDetails,
                formattedAddress: quote.destination.to.formattedAddress
              },
              pickupDate: quote.destination.pickupDate,
              pickupTimeSlot: quote.destination.pickupTimeSlot
            },
            packageDetails: {
              type: quote.packageDetails.type,
              volume: quote.packageDetails.volume,
              weight: quote.packageDetails.weight,
              hazardous: quote.packageDetails.hazardous,
              palletCount: quote.packageDetails.palletCount,
              specialRequirements: quote.packageDetails.specialRequirements
            },
            selectedService: quote.selectedService,
            estimatedPrice: quote.estimatedPrice,
            estimatedDelivery: quote.estimatedDelivery
          }
        }
      };

      this.log('Creating ticket with data:', ticketData);

      // Make the API call to create the ticket
      const response = await fetch(`${this.baseUrl}/rest/v1/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': metadata.token || '',
          'Authorization': `Bearer ${metadata.token || ''}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(ticketData)
      });

      this.log('Request headers:', {
        'apikey': metadata.token ? `${metadata.token.substring(0, 10)}...` : 'none',
        'Authorization': metadata.token ? `Bearer ${metadata.token.substring(0, 10)}...` : 'none'
      });

      const responseText = await response.text();
      this.log('Response status:', response.status);
      this.log('Response text:', responseText);
      this.log('Request URL:', `${this.baseUrl}/rest/v1/tickets`);

      if (!response.ok) {
        return { 
          success: false, 
          error: `Failed to create ticket: ${responseText}` 
        };
      }

      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : { id: 'created' };
      } catch (error) {
        this.log('Error parsing response:', error);
        if (response.status === 201) {
          responseData = { id: 'created' };
        } else {
          return {
            success: false,
            error: `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }

      this.log('Successfully created ticket:', responseData);
      return { 
        success: true, 
        ticket: responseData 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.log('Error in createTicketDirect:', errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }

  private async createTicket(messages: AgentMessage[], metadata: any): Promise<boolean> {
    try {
      const quoteDetails = await this.collectQuoteDetails(messages);
      if (!quoteDetails) {
        return false;
      }

      const result = await this.createTicketDirect(quoteDetails, metadata);
      return result.success;
    } catch (error) {
      this.log('Error in createTicket:', error);
      return false;
    }
  }

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

    // If the last assistant message asked for confirmation and user said yes/no
    if (lastAssistantMessage.includes('create this shipping quote') && 
        (lastUserMessage.toLowerCase().includes('yes') || lastUserMessage.toLowerCase().includes('no'))) {
      return 'confirmation';
    }

    // If the last assistant message showed service options
    if (lastAssistantMessage.includes('service option') || lastAssistantMessage.includes('Express Freight')) {
      return 'service_selection';
    }

    // If we have package details but no addresses
    const packageDetails = this.findLastPackageDetails(messages);
    const addressDetails = this.findLastAddressDetails(messages);
    if (packageDetails && !addressDetails) {
      return 'addresses';
    }

    // If we have addresses but no service selection
    const serviceDetails = this.findLastServiceSelection(messages);
    if (addressDetails && !serviceDetails) {
      return 'service_selection';
    }

    // If we have all details, move to confirmation
    if (packageDetails && addressDetails && serviceDetails) {
      return 'confirmation';
    }

    // If we're just starting or need package details
    if (!packageDetails) {
      return 'package_details';
    }

    return 'initial';
  }

  private extractPackageDetails(content: string): QuoteState['packageDetails'] | null {
    try {
      this.log('Extracting package details from:', content);
      const contentLower = content.toLowerCase();
      
      let type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight' | null = null;
      
      if (contentLower.match(/\b(full.*truck|ftl|full.*load)\b/)) {
        type = 'full_truckload';
      } else if (contentLower.match(/\b(less.*truck|ltl|less.*load)\b/)) {
        type = 'less_than_truckload';
      } else if (contentLower.match(/\b(container|sea.*freight)\b/)) {
        type = 'sea_container';
      } else if (contentLower.match(/\b(bulk)\b/)) {
        type = 'bulk_freight';
      }

      if (!type) {
        return null;
      }

      const weightMatch = contentLower.match(/(\d+(?:\.\d+)?)\s*(?:ton|tons|t\b|tonnes)/);
      if (!weightMatch) {
        return null;
      }
      const weight = weightMatch[1];

      const volumeMatch = contentLower.match(/(\d+(?:\.\d+)?)\s*(?:cubic\s*meter|cubic\s*meters|m3|m³|cbm)/);
      if (!volumeMatch) {
        return null;
      }
      const volume = volumeMatch[1];

      const hasHazardousWord = contentLower.includes('hazardous') || contentLower.includes('dangerous');
      const hasNegation = contentLower.includes('no') || contentLower.includes('non') || contentLower.includes('not');
      const hazardous = hasHazardousWord && !hasNegation;

      return {
        type,
        weight,
        volume,
        hazardous,
        specialRequirements: ''
      };
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
      const dateMatch = content.match(/next\s+(\w+)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      let pickupDateTime = '';
      
      if (dateMatch) {
        const [_, day, hour, minute, ampm] = dateMatch;
        const today = new Date();
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = daysOfWeek.findIndex(d => d.toLowerCase().startsWith(day.toLowerCase()));
        
        if (targetDay !== -1) {
          let daysToAdd = targetDay - today.getDay();
          if (daysToAdd <= 0) daysToAdd += 7; // If the target day is today or earlier, go to next week
          const pickupDate = new Date(today);
          pickupDate.setDate(today.getDate() + daysToAdd);
          
          // Parse hour and adjust for AM/PM
          let hourNum = parseInt(hour);
          if (ampm?.toLowerCase() === 'pm' && hourNum < 12) hourNum += 12;
          if (ampm?.toLowerCase() === 'am' && hourNum === 12) hourNum = 0;
          pickupDate.setHours(hourNum, minute ? parseInt(minute) : 0, 0, 0);
          
          pickupDateTime = pickupDate.toISOString();
        }
      }

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
        pickupDateTime: pickupDateTime || undefined
      };

      this.log('Extracted address details:', addressDetails);
      return addressDetails;
    } catch (error) {
      this.log('Error extracting address details:', error);
      return null;
    }
  }

  private findLastPackageDetails(messages: AgentMessage[]): QuoteState['packageDetails'] | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'user') {
        const details = this.extractPackageDetails(message.content);
        if (details) return details;
      }
    }
    return null;
  }

  private findLastAddressDetails(messages: AgentMessage[]): QuoteState['addressDetails'] | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'user') {
        const details = this.extractAddressDetails(message.content);
        if (details) return details;
      }
    }
    return null;
  }

  private findLastServiceSelection(messages: AgentMessage[]): QuoteState['serviceDetails'] | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'user') {
        const details = this.extractServiceSelection(message.content);
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

      // Only match exact service selections
      if (contentLower.match(/^(?:option\s*)?1\s*$/) || contentLower.match(/\b(?:express|express[\s-]freight)\b/)) {
        type = 'express_freight';
      } else if (contentLower.match(/^(?:option\s*)?2\s*$/) || contentLower.match(/\b(?:standard|standard[\s-]freight)\b/)) {
        type = 'standard_freight';
      } else if (contentLower.match(/^(?:option\s*)?3\s*$/) || contentLower.match(/\b(?:eco|eco[\s-]freight)\b/)) {
        type = 'eco_freight';
      }

      if (!type) {
        this.log('No service selection found');
        return null;
      }

      // Get the quote metadata
      const quote = this.context?.metadata?.quote;
      if (!quote) {
        this.log('No quote metadata found');
        return null;
      }

      // Use the pre-calculated service options from metadata
      let price = 0;
      let duration = '';

      switch (type) {
        case 'express_freight':
          price = quote.expressPrice || 0;
          duration = quote.expressDelivery || '';
          break;
        case 'standard_freight':
          price = quote.standardPrice || 0;
          duration = quote.standardDelivery || '';
          break;
        case 'eco_freight':
          price = quote.ecoPrice || 0;
          duration = quote.ecoDelivery || '';
          break;
      }

      this.log('Using pre-calculated service options:', { type, price, duration });

      return {
        type,
        price,
        duration
      };
    } catch (error) {
      this.log('Error extracting service details:', error);
      return null;
    }
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
    this.context = context;
    this.debugLogs = [];
    this.log('QuoteAgent: Starting process with context:', {
      metadata: context.metadata,
      messageCount: context.messages.length
    });

    // Validate user authentication at the start
    if (!context.metadata?.session?.user?.id) {
      return {
        content: "I apologize, but you need to be logged in to create a shipping quote. Please log in and try again.",
        metadata: {
          agentId: 'quote',
          timestamp: Date.now(),
          error: 'Authentication required'
        }
      };
    }

    // Store customer information for the session
    const customer = {
      id: context.metadata.session.user.id,
      name: context.metadata.session.user.user_metadata?.full_name || 
            context.metadata.session.user.email?.split('@')[0] || 
            'Anonymous',
      email: context.metadata.session.user.email || 'anonymous@example.com'
    };

    // Log customer information for debugging
    this.log('Customer information:', customer);

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
      response = this.QUOTE_MESSAGES.START_QUOTE;
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
          this.QUOTE_MESSAGES.ADDRESS_DETAILS;
      } else {
        response = this.QUOTE_MESSAGES.START_QUOTE;
      }
    }
    // If we're waiting for addresses
    else if (step === 'addresses') {
      const addressDetails = this.extractAddressDetails(lastUserMessage);
      const packageDetails = this.findLastPackageDetails(allMessages);
      
      if (addressDetails) {
        // Get distance from metadata instead of calculating it
        const distance = this.getDistanceFromMetadata(context);
        const isRushDelivery = this.isRushDeliveryFromMetadata(context);

        response = "Great! I've got your shipping details:\n\n" +
          "Pickup Address:\n" +
          `${addressDetails.pickup.address}, ${addressDetails.pickup.city}` +
          (addressDetails.pickup.state ? `, ${addressDetails.pickup.state}` : '') + "\n\n" +
          "Delivery Address:\n" +
          `${addressDetails.delivery.address}, ${addressDetails.delivery.city}` +
          (addressDetails.delivery.state ? `, ${addressDetails.delivery.state}` : '') + "\n\n" +
          (addressDetails.pickupDateTime ? `Pickup Time: ${addressDetails.pickupDateTime}\n\n` : '') +
          this.QUOTE_MESSAGES.SERVICE_OPTIONS(context.metadata?.quote);
      } else if (packageDetails) {
        response = "I'll need the following information to proceed:\n\n" +
          "1. Complete pickup address (including city and state)\n" +
          "2. Complete delivery address (including city and state)\n" +
          "3. Preferred pickup date and time\n\n" +
          "Please provide all these details in your response.";
      } else {
        response = this.QUOTE_MESSAGES.START_QUOTE;
      }
    }
    // If we're waiting for service selection
    else if (step === 'service_selection') {
      const serviceDetails = this.extractServiceSelection(lastUserMessage);
      const packageDetails = this.findLastPackageDetails(allMessages);
      
      // If they haven't made a selection yet, show the options
      if (!serviceDetails) {
        // Check if we have route information from metadata
        const hasRouteInfo = context.metadata?.quote?.route;

        if (hasRouteInfo) {
          response = this.QUOTE_MESSAGES.SERVICE_OPTIONS(context.metadata?.quote);
        } else {
          response = "I need the pickup and delivery addresses to calculate service options. Please provide:\n\n" +
            "1. Complete pickup address (including city and state)\n" +
            "2. Complete delivery address (including city and state)\n" +
            "3. Preferred pickup date and time";
        }
      } else {
        // Use the calculated price and delivery date
        const quote = context.metadata?.quote;
        if (!quote) {
          response = "I apologize, but I couldn't find the quote details. Let's start over:\n\n" + this.QUOTE_MESSAGES.START_QUOTE;
        } else {
          response = "Perfect! I've got your service selection:\n\n" +
            `Service: ${serviceDetails.type.replace(/_/g, ' ')}\n` +
            `Price: $${serviceDetails.price}\n` +
            `Estimated Delivery: ${serviceDetails.duration}\n\n` +
            "Would you like me to create this shipping quote for you? (yes/no)";
        }
      }
    }
    // If we're in confirmation
    else if (step === 'confirmation') {
      const quote = context.metadata?.quote;
      if (quote) {
        response = "Perfect! I've got your service selection:\n\n" +
          `Service: ${quote.selectedService.replace(/_/g, ' ')}\n` +
          `Price: $${quote.estimatedPrice}\n` +
          `Estimated Delivery: ${quote.estimatedDelivery}\n\n` +
          "Would you like me to create this shipping quote for you? (yes/no)";
      } else {
        response = "I couldn't understand your service selection. Please choose one of the following options:\n\n" +
          "1. Express Freight\n" +
          "2. Standard Freight\n" +
          "3. Eco Freight";
      }
    }
    // Default to starting over
    else {
      response = this.QUOTE_MESSAGES.START_QUOTE;
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

  private expandStateName(stateCode: string | undefined): string {
    if (!stateCode) return '';
    
    const stateMap: Record<string, string> = {
      'AL': 'Alabama',
      'AK': 'Alaska',
      'AZ': 'Arizona',
      'AR': 'Arkansas',
      'CA': 'California',
      'CO': 'Colorado',
      'CT': 'Connecticut',
      'DE': 'Delaware',
      'FL': 'Florida',
      'GA': 'Georgia',
      'HI': 'Hawaii',
      'ID': 'Idaho',
      'IL': 'Illinois',
      'IN': 'Indiana',
      'IA': 'Iowa',
      'KS': 'Kansas',
      'KY': 'Kentucky',
      'LA': 'Louisiana',
      'ME': 'Maine',
      'MD': 'Maryland',
      'MA': 'Massachusetts',
      'MI': 'Michigan',
      'MN': 'Minnesota',
      'MS': 'Mississippi',
      'MO': 'Missouri',
      'MT': 'Montana',
      'NE': 'Nebraska',
      'NV': 'Nevada',
      'NH': 'New Hampshire',
      'NJ': 'New Jersey',
      'NM': 'New Mexico',
      'NY': 'New York',
      'NC': 'North Carolina',
      'ND': 'North Dakota',
      'OH': 'Ohio',
      'OK': 'Oklahoma',
      'OR': 'Oregon',
      'PA': 'Pennsylvania',
      'RI': 'Rhode Island',
      'SC': 'South Carolina',
      'SD': 'South Dakota',
      'TN': 'Tennessee',
      'TX': 'Texas',
      'UT': 'Utah',
      'VT': 'Vermont',
      'VA': 'Virginia',
      'WA': 'Washington',
      'WV': 'West Virginia',
      'WI': 'Wisconsin',
      'WY': 'Wyoming'
    };
    
    return stateMap[stateCode.toUpperCase()] || stateCode;
  }
}