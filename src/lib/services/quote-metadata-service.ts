import { QuoteMetadata } from '@/types/quote';
import { radarService } from './radar-service';
import { quoteCalculationService } from './quote-calculation-service';

export const quoteMetadataService = {
  findLastPackageDetails(messages: Array<{ role: string; content: string }>): QuoteMetadata['packageDetails'] | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'user') {
        const details = this.extractPackageDetails(message.content);
        if (details) return details;
      }
    }
    return null;
  },

  extractPackageDetails(content: string): QuoteMetadata['packageDetails'] | null {
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

      if (!type) return null;

      const weightMatch = contentLower.match(/(\d+(?:\.\d+)?)\s*(?:ton|tons|t\b|tonnes)/);
      if (!weightMatch) return null;
      const weight = weightMatch[1];

      const volumeMatch = contentLower.match(/(\d+(?:\.\d+)?)\s*(?:cubic\s*meter|cubic\s*meters|m3|m³|cbm)/);
      if (!volumeMatch) return null;
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
      console.error('Error extracting package details:', error);
      return null;
    }
  },

  async validateAddresses(content: string, callbacks?: {
    onGeocoding?: () => void;
    onRouteCalculation?: () => void;
    onServiceCalculation?: () => void;
  }): Promise<{
    isValid: boolean;
    error?: string;
    quoteMetadata?: QuoteMetadata;
  }> {
    // Extract addresses from the message
    const fromMatch = content.match(/(?:from|pickup).*?([^,]+,[^,]+,[^,]+)/i);
    const toMatch = content.match(/(?:to|delivery).*?([^,]+,[^,]+,[^,]+)/i);

    if (!fromMatch || !toMatch) {
      return {
        isValid: false,
        error: 'Could not find both pickup and delivery addresses in your message. Please provide complete addresses.'
      };
    }

    // Clean up the extracted addresses
    const fromAddress = fromMatch[1].trim().replace(/^(?:from|pickup)\s+/i, '');
    const toAddress = toMatch[1].trim().replace(/^(?:to|delivery)\s+/i, '');

    // Geocode both addresses
    callbacks?.onGeocoding?.();
    const [fromGeocode, toGeocode] = await Promise.all([
      radarService.geocodeAddress(fromAddress),
      radarService.geocodeAddress(toAddress)
    ]);

    if (!fromGeocode || !toGeocode) {
      return {
        isValid: false,
        error: 'One or both addresses could not be found. Please check the addresses and try again.'
      };
    }

    // Calculate route
    callbacks?.onRouteCalculation?.();
    const route = await quoteCalculationService.calculateRoute(
      { latitude: fromGeocode.latitude, longitude: fromGeocode.longitude },
      { latitude: toGeocode.latitude, longitude: toGeocode.longitude }
    );

    if (!route) {
      return {
        isValid: false,
        error: 'Could not calculate a route between these addresses. Please try different addresses.'
      };
    }

    callbacks?.onServiceCalculation?.();

    // Parse pickup date from the message
    let pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 1); // Default to tomorrow
    pickupDate.setHours(9, 0, 0, 0);

    const dateMatch = content.match(/next\s+(\w+)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (dateMatch) {
      const [_, day, hour, minute, ampm] = dateMatch;
      const today = new Date();
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = daysOfWeek.findIndex(d => d.toLowerCase().startsWith(day.toLowerCase()));
      
      if (targetDay !== -1) {
        let daysToAdd = targetDay - today.getDay();
        if (daysToAdd <= 0) daysToAdd += 7;
        pickupDate = new Date(today);
        pickupDate.setDate(today.getDate() + daysToAdd);
        
        let hourNum = parseInt(hour);
        if (ampm?.toLowerCase() === 'pm' && hourNum < 12) hourNum += 12;
        if (ampm?.toLowerCase() === 'am' && hourNum === 12) hourNum = 0;
        pickupDate.setHours(hourNum, minute ? parseInt(minute) : 0, 0, 0);
      }
    }

    // Get pickup time slot based on the hour
    const hour = pickupDate.getHours();
    let pickupTimeSlot = 'morning_2';
    if (hour >= 12 && hour < 17) {
      pickupTimeSlot = 'afternoon_2';
    } else if (hour >= 17) {
      pickupTimeSlot = 'evening_2';
    }

    return {
      isValid: true,
      quoteMetadata: {
        isQuote: true,
        destination: {
          from: {
            address: fromGeocode.formattedAddress,
            coordinates: {
              latitude: fromGeocode.latitude,
              longitude: fromGeocode.longitude
            },
            placeDetails: {
              city: fromGeocode.city,
              state: fromGeocode.state,
              country: fromGeocode.country,
              latitude: fromGeocode.latitude,
              longitude: fromGeocode.longitude,
              stateCode: fromGeocode.stateCode,
              postalCode: fromGeocode.postalCode,
              coordinates: {
                latitude: fromGeocode.latitude,
                longitude: fromGeocode.longitude
              },
              countryCode: fromGeocode.countryCode,
              countryFlag: fromGeocode.countryFlag,
              formattedAddress: fromGeocode.formattedAddress
            },
            formattedAddress: fromGeocode.formattedAddress
          },
          to: {
            address: toGeocode.formattedAddress,
            coordinates: {
              latitude: toGeocode.latitude,
              longitude: toGeocode.longitude
            },
            placeDetails: {
              city: toGeocode.city,
              state: toGeocode.state,
              country: toGeocode.country,
              latitude: toGeocode.latitude,
              longitude: toGeocode.longitude,
              stateCode: toGeocode.stateCode,
              postalCode: toGeocode.postalCode,
              coordinates: {
                latitude: toGeocode.latitude,
                longitude: toGeocode.longitude
              },
              countryCode: toGeocode.countryCode,
              countryFlag: toGeocode.countryFlag,
              formattedAddress: toGeocode.formattedAddress
            },
            formattedAddress: toGeocode.formattedAddress
          },
          pickupDate: pickupDate.toISOString().split('T')[0],
          pickupTimeSlot
        },
        route
      }
    };
  },

  calculateServiceOptions(quoteMetadata: QuoteMetadata): {
    expressPrice: number;
    standardPrice: number;
    ecoPrice: number;
    expressDelivery: string;
    standardDelivery: string;
    ecoDelivery: string;
  } | null {
    if (!quoteMetadata?.packageDetails?.volume || 
        !quoteMetadata?.packageDetails?.weight || 
        !quoteMetadata?.route?.distance?.kilometers) {
      return null;
    }

    const { volume, weight, palletCount } = quoteMetadata.packageDetails;
    const { kilometers } = quoteMetadata.route.distance;
    const pickupDate = quoteMetadata.destination?.pickupDate || new Date().toISOString().split('T')[0];

    const expressPrice = quoteCalculationService.calculateServicePrice(
      'express_freight', 
      kilometers,
      parseFloat(volume),
      parseFloat(weight),
      parseInt(palletCount || '0'),
      true
    );

    const standardPrice = quoteCalculationService.calculateServicePrice(
      'standard_freight', 
      kilometers,
      parseFloat(volume),
      parseFloat(weight),
      parseInt(palletCount || '0'),
      false
    );

    const ecoPrice = quoteCalculationService.calculateServicePrice(
      'eco_freight', 
      kilometers,
      parseFloat(volume),
      parseFloat(weight),
      parseInt(palletCount || '0'),
      false
    );

    return {
      expressPrice,
      standardPrice,
      ecoPrice,
      expressDelivery: quoteCalculationService.calculateEstimatedDelivery(pickupDate, 'express_freight'),
      standardDelivery: quoteCalculationService.calculateEstimatedDelivery(pickupDate, 'standard_freight'),
      ecoDelivery: quoteCalculationService.calculateEstimatedDelivery(pickupDate, 'eco_freight')
    };
  },

  isAddressStep(lastAssistantMessage: string): boolean {
    return lastAssistantMessage.includes('pickup address') || 
           lastAssistantMessage.includes('delivery address') ||
           lastAssistantMessage.includes('Complete pickup address') ||
           lastAssistantMessage.includes('Complete delivery address');
  },

  hasAddressInfo(input: string): boolean {
    return input.toLowerCase().includes('from') || 
           input.toLowerCase().includes('to') ||
           input.toLowerCase().includes('pickup') || 
           input.toLowerCase().includes('delivery');
  }
}; 