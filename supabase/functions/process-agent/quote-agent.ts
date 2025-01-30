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

    SERVICE_OPTIONS: (distance: number, pickupDate?: string) => {
      const expressPrice = Math.ceil((distance * 2.5 + 1000) / 100) * 100;
      const standardPrice = Math.ceil((distance * 1.5 + 500) / 100) * 100;
      const ecoPrice = Math.ceil((distance * 1.0 + 300) / 100) * 100;

      const getDeliveryDate = (daysToAdd: number): string => {
        const date = new Date(pickupDate || new Date());
        date.setDate(date.getDate() + daysToAdd);
        return date.toISOString().split('T')[0];
      };

      return `Based on your shipment details, here are the available service options:

1. Express Freight - $${expressPrice}
   - Priority handling and expedited transport
   - Estimated delivery: ${getDeliveryDate(2)}

2. Standard Freight - $${standardPrice}
   - Regular service with standard handling
   - Estimated delivery: ${getDeliveryDate(4)}

3. Eco Freight - $${ecoPrice}
   - Cost-effective with consolidated handling
   - Estimated delivery: ${getDeliveryDate(6)}

Please select your preferred service option (1, 2, or 3):`;
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

  private calculateEstimatedDeliveryDate(pickupDate: string, serviceType: string): string {
    if (!pickupDate) return '';
    
    const date = new Date(pickupDate);
    let daysToAdd = 2; // default for express

    switch (serviceType) {
      case 'express_freight':
        daysToAdd = 2;
        break;
      case 'standard_freight':
        daysToAdd = 4;
        break;
      case 'eco_freight':
        daysToAdd = 6;
        break;
    }

    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }

  public async process(context: AgentContext): Promise<AgentResponse> {
    this.debugLogs = []; // Reset debug logs at the start of processing
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
          this.QUOTE_MESSAGES.SERVICE_OPTIONS(distance, addressDetails.pickupDateTime);
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
          response = this.QUOTE_MESSAGES.SERVICE_OPTIONS(distance, lastAddressDetails.pickupDateTime);
        } else {
          response = "I couldn't find the address details. Let's start over:\n\n" + this.QUOTE_MESSAGES.START_QUOTE;
        }
      } else {
        response = "Perfect! I've got your service selection:\n\n" +
          `Service: ${serviceDetails.type.replace(/_/g, ' ')}\n` +
          `Price: $${serviceDetails.price}\n` +
          `Estimated Delivery: ${serviceDetails.duration}\n\n` +
          "Would you like me to create this shipping quote for you? (yes/no)";
      }
    }
    // If we're in confirmation
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
        // Get token from metadata or use service role key
        const token = context.metadata?.token || context.metadata?.supabaseToken || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!token) {
          this.log('No token found in metadata:', context.metadata);
          response = "I apologize, but I need authorization to create the quote. Please try again with proper authentication.";
        } else {
          // Get the logged-in user's information from the auth context
          const authUser = context.metadata?.session?.user;
          if (!authUser?.id) {
            this.log('No authenticated user found:', context.metadata);
            response = "I apologize, but you need to be logged in to create a quote. Please log in and try again.";
          } else {
            // Collect all the details from the conversation
            const packageDetails = this.findLastPackageDetails(context.messages);
            const addressDetails = this.findLastAddressDetails(context.messages);
            const serviceDetails = this.findLastServiceSelection(context.messages);

            if (!packageDetails || !addressDetails || !serviceDetails) {
              response = "I apologize, but I couldn't find all the necessary details. Let's start over:\n\n" + this.QUOTE_MESSAGES.START_QUOTE;
              return {
                content: response,
                metadata: {
                  agentId: 'quote',
                  timestamp: Date.now(),
                  error: 'Missing required details'
                }
              };
            }

            // Calculate distance for price adjustment
            const distance = this.calculateDistance(
              { city: addressDetails.pickup.city || '', state: addressDetails.pickup.state || '' },
              { city: addressDetails.delivery.city || '', state: addressDetails.delivery.state || '' }
            );

            // Parse pickup date and time
            const pickupDateTime = addressDetails.pickupDateTime || '';
            const [day, time] = pickupDateTime.split(' at ');
            const pickupDate = day ? new Date().toISOString().split('T')[0] : ''; // You may want to properly parse the day
            const pickupTimeSlot = time && time.toLowerCase().includes('am') ? 'morning_2' : 
                                 time && time.toLowerCase().includes('pm') && parseInt(time) < 5 ? 'afternoon_2' : 
                                 'evening_2';

            const success = await this.createTicket(context.messages, {
              token,
              customer,
              quote: {
                isQuote: true,
                destination: {
                  from: {
                    address: `${addressDetails.pickup.address}, ${addressDetails.pickup.city}, ${addressDetails.pickup.state} ${context.metadata?.quote?.destination?.from?.placeDetails?.postalCode || ''} USA`,
                    coordinates: {
                      latitude: context.metadata?.quote?.destination?.from?.coordinates?.latitude || 
                               context.metadata?.quote?.destination?.from?.placeDetails?.coordinates?.latitude || 
                               context.metadata?.quote?.destination?.from?.placeDetails?.latitude || 0,
                      longitude: context.metadata?.quote?.destination?.from?.coordinates?.longitude || 
                                context.metadata?.quote?.destination?.from?.placeDetails?.coordinates?.longitude || 
                                context.metadata?.quote?.destination?.from?.placeDetails?.longitude || 0
                    },
                    placeDetails: {
                      city: addressDetails.pickup.city || '',
                      state: this.expandStateName(addressDetails.pickup.state) || '',
                      country: 'United States',
                      latitude: context.metadata?.quote?.destination?.from?.coordinates?.latitude || 
                               context.metadata?.quote?.destination?.from?.placeDetails?.coordinates?.latitude || 
                               context.metadata?.quote?.destination?.from?.placeDetails?.latitude || 0,
                      longitude: context.metadata?.quote?.destination?.from?.coordinates?.longitude || 
                                context.metadata?.quote?.destination?.from?.placeDetails?.coordinates?.longitude || 
                                context.metadata?.quote?.destination?.from?.placeDetails?.longitude || 0,
                      stateCode: addressDetails.pickup.state || '',
                      postalCode: context.metadata?.quote?.destination?.from?.placeDetails?.postalCode || '',
                      coordinates: {
                        latitude: context.metadata?.quote?.destination?.from?.coordinates?.latitude || 
                                 context.metadata?.quote?.destination?.from?.placeDetails?.coordinates?.latitude || 
                                 context.metadata?.quote?.destination?.from?.placeDetails?.latitude || 0,
                        longitude: context.metadata?.quote?.destination?.from?.coordinates?.longitude || 
                                  context.metadata?.quote?.destination?.from?.placeDetails?.coordinates?.longitude || 
                                  context.metadata?.quote?.destination?.from?.placeDetails?.longitude || 0
                      },
                      countryCode: 'US',
                      countryFlag: '🇺🇸',
                      formattedAddress: context.metadata?.quote?.destination?.from?.formattedAddress || 
                        `${addressDetails.pickup.address}, ${addressDetails.pickup.city}, ${addressDetails.pickup.state} ${context.metadata?.quote?.destination?.from?.placeDetails?.postalCode || ''} US`
                    },
                    formattedAddress: context.metadata?.quote?.destination?.from?.formattedAddress || 
                      `${addressDetails.pickup.address}, ${addressDetails.pickup.city}, ${addressDetails.pickup.state} ${context.metadata?.quote?.destination?.from?.placeDetails?.postalCode || ''} US`
                  },
                  to: {
                    address: `${addressDetails.delivery.address}, ${addressDetails.delivery.city}, ${addressDetails.delivery.state} ${context.metadata?.quote?.destination?.to?.placeDetails?.postalCode || ''} USA`,
                    coordinates: {
                      latitude: context.metadata?.quote?.destination?.to?.coordinates?.latitude || 
                               context.metadata?.quote?.destination?.to?.placeDetails?.coordinates?.latitude || 
                               context.metadata?.quote?.destination?.to?.placeDetails?.latitude || 0,
                      longitude: context.metadata?.quote?.destination?.to?.coordinates?.longitude || 
                                context.metadata?.quote?.destination?.to?.placeDetails?.coordinates?.longitude || 
                                context.metadata?.quote?.destination?.to?.placeDetails?.longitude || 0
                    },
                    placeDetails: {
                      city: addressDetails.delivery.city || '',
                      state: this.expandStateName(addressDetails.delivery.state) || '',
                      country: 'United States',
                      latitude: context.metadata?.quote?.destination?.to?.coordinates?.latitude || 
                               context.metadata?.quote?.destination?.to?.placeDetails?.coordinates?.latitude || 
                               context.metadata?.quote?.destination?.to?.placeDetails?.latitude || 0,
                      longitude: context.metadata?.quote?.destination?.to?.coordinates?.longitude || 
                                context.metadata?.quote?.destination?.to?.placeDetails?.coordinates?.longitude || 
                                context.metadata?.quote?.destination?.to?.placeDetails?.longitude || 0,
                      stateCode: addressDetails.delivery.state || '',
                      postalCode: context.metadata?.quote?.destination?.to?.placeDetails?.postalCode || '',
                      coordinates: {
                        latitude: context.metadata?.quote?.destination?.to?.coordinates?.latitude || 
                                 context.metadata?.quote?.destination?.to?.placeDetails?.coordinates?.latitude || 
                                 context.metadata?.quote?.destination?.to?.placeDetails?.latitude || 0,
                        longitude: context.metadata?.quote?.destination?.to?.coordinates?.longitude || 
                                  context.metadata?.quote?.destination?.to?.placeDetails?.coordinates?.longitude || 
                                  context.metadata?.quote?.destination?.to?.placeDetails?.longitude || 0
                      },
                      countryCode: 'US',
                      countryFlag: '🇺🇸',
                      formattedAddress: context.metadata?.quote?.destination?.to?.formattedAddress || 
                        `${addressDetails.delivery.address}, ${addressDetails.delivery.city}, ${addressDetails.delivery.state} ${context.metadata?.quote?.destination?.to?.placeDetails?.postalCode || ''} US`
                    },
                    formattedAddress: context.metadata?.quote?.destination?.to?.formattedAddress || 
                      `${addressDetails.delivery.address}, ${addressDetails.delivery.city}, ${addressDetails.delivery.state} ${context.metadata?.quote?.destination?.to?.placeDetails?.postalCode || ''} US`
                  },
                  pickupDate: context.metadata?.quote?.destination?.pickupDate || pickupDate,
                  pickupTimeSlot: context.metadata?.quote?.destination?.pickupTimeSlot || pickupTimeSlot
                },
                packageDetails: {
                  type: packageDetails.type,
                  volume: packageDetails.volume,
                  weight: packageDetails.weight,
                  hazardous: packageDetails.hazardous,
                  palletCount: packageDetails.palletCount || '',
                  specialRequirements: packageDetails.specialRequirements || ''
                },
                selectedService: serviceDetails.type,
                estimatedPrice: serviceDetails.price,
                estimatedDelivery: this.calculateEstimatedDeliveryDate(
                  context.metadata?.quote?.destination?.pickupDate || pickupDate,
                  serviceDetails.type
                )
              }
            });
            if (success) {
              response = "Great! I've created your shipping quote. You'll receive a confirmation email shortly with all the details.\n\n" +
                "Is there anything else I can help you with?";
            } else {
              response = "I apologize, but I encountered an error while creating your quote. Would you like to try again?";
            }
          }
        }
      } else if (confirmation.includes('no') || confirmation.includes('nope') || confirmation.includes('cancel')) {
        response = "No problem! Let me know if you'd like to create a different quote or if there's anything else I can help you with.";
      } else {
        response = "I didn't catch that. Would you like me to create this shipping quote for you? Please answer with yes or no.";
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