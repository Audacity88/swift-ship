import OpenAI from 'https://esm.sh/openai@4';

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

  constructor(baseUrl: string = 'http://localhost:3000') {
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
    }
  ): Promise<{ success: boolean; error?: string; ticket?: any }> {
    try {
      const { packageDetails, addressDetails, serviceDetails } = quoteDetails;

      // Format the ticket data according to the API schema
      const ticketData = {
        title: `Shipping Quote - ${serviceDetails.type.replace(/_/g, ' ')}`,
        description: `
Package Details:
- Type: ${packageDetails.type.replace(/_/g, ' ')}
- Weight: ${packageDetails.weight} tons
- Volume: ${packageDetails.volume} cubic meters
- Hazardous: ${packageDetails.hazardous ? 'Yes' : 'No'}

Pickup Address:
${addressDetails.pickup.address}
${addressDetails.pickup.city}${addressDetails.pickup.state ? `, ${addressDetails.pickup.state}` : ''}
Pickup Time: ${addressDetails.pickupDateTime || 'Not specified'}

Delivery Address:
${addressDetails.delivery.address}
${addressDetails.delivery.city}${addressDetails.delivery.state ? `, ${addressDetails.delivery.state}` : ''}

Service Details:
- Service Type: ${serviceDetails.type.replace(/_/g, ' ')}
- Price: $${serviceDetails.price}
- Estimated Duration: ${serviceDetails.duration}
        `.trim(),
        priority: 'medium',
        customerId: metadata.customer?.id,
        metadata: {
          quoteDetails: {
            package: packageDetails,
            addresses: addressDetails,
            service: serviceDetails
          }
        }
      };

      this.log('Creating ticket with data:', ticketData);

      // Make the API call to create the ticket
      const response = await fetch(`${this.baseUrl}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': metadata.token ? `Bearer ${metadata.token}` : ''
        },
        body: JSON.stringify(ticketData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || response.statusText;
        this.log('Failed to create ticket:', errorMessage);
        return { 
          success: false, 
          error: `Failed to create ticket: ${errorMessage}` 
        };
      }

      this.log('Successfully created ticket:', responseData.data);
      return { 
        success: true, 
        ticket: responseData.data 
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

  private extractPackageDetails(content: string): QuoteState['packageDetails'] | null {
    try {
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
      const contentLower = content.toLowerCase();

      let pickupMatch = content.match(/(?:pickup|from)\s+(?:at|from)?\s*([^,]+),\s*([^,]+),\s*([A-Z]{2})/i);
      if (!pickupMatch) {
        pickupMatch = content.match(/(?:pickup|from)\s+(?:at|from)?\s*([^,]+),\s*([^,]+)/i);
      }
      if (!pickupMatch) return null;

      let deliveryMatch = content.match(/(?:delivery|to)\s+(?:at|to)?\s*([^,]+),\s*([^,]+),\s*([A-Z]{2})/i);
      if (!deliveryMatch) {
        deliveryMatch = content.match(/(?:delivery|to)\s+(?:at|to)?\s*([^,]+),\s*([^,]+)/i);
      }
      if (!deliveryMatch) return null;

      const dateTimeMatch = content.match(/(?:pickup|schedule|on|at)\s+(?:next\s+)?(\w+)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?(?:\s*[AaPp][Mm])?)/i);

      return {
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
    } catch (error) {
      this.log('Error extracting address details:', error);
      return null;
    }
  }

  private extractServiceSelection(content: string): QuoteState['serviceDetails'] | null {
    try {
      const contentLower = content.toLowerCase();

      let type: 'express_freight' | 'standard_freight' | 'eco_freight' | null = null;
      let price = 0;
      let duration = '';

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
        return null;
      }

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
} 