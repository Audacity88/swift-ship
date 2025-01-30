import { radarService, type RouteInfo } from './radar-service'

// Base rates per kilometer for different services
export const SERVICE_RATES = {
  express_freight: {
    basePrice: 1500,      // Base price for any distance
    perKm: 2.5,          // Cost per kilometer
    perM3: 8,            // Cost per cubic meter of volume
    perTon: 15,          // Cost per metric ton
    perPallet: 12,       // Cost per pallet
    speedFactor: 1.0,    // Multiplier for estimated duration
    rushFactor: 1.5      // Price multiplier for expedited delivery
  },
  standard_freight: {
    basePrice: 1000,
    perKm: 1.8,
    perM3: 6,
    perTon: 12,
    perPallet: 10,
    speedFactor: 1.3,
    rushFactor: 1.0
  },
  eco_freight: {
    basePrice: 800,
    perKm: 1.2,
    perM3: 4,
    perTon: 8,
    perPallet: 8,
    speedFactor: 1.6,
    rushFactor: 0.8
  }
}

export type ServiceType = keyof typeof SERVICE_RATES

export interface ServiceOption {
  id: ServiceType
  name: string
  price: number
  duration: string
  description: string
}

class QuoteCalculationService {
  // Calculate route between two points
  async calculateRoute(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): Promise<RouteInfo | null> {
    try {
      const route = await radarService.calculateRoute(from, to)
      if (route) return route

      // Fallback to straight-line calculation if radar service fails
      return this.calculateFallbackRoute(from, to)
    } catch (error) {
      console.error('Error calculating route:', error)
      return this.calculateFallbackRoute(from, to)
    }
  }

  // Fallback route calculation using straight-line distance (Haversine formula)
  private calculateFallbackRoute(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): RouteInfo {
    const R = 6371 // Earth's radius in kilometers

    const dLat = this.toRad(to.latitude - from.latitude)
    const dLon = this.toRad(to.longitude - from.longitude)
    const lat1 = this.toRad(from.latitude)
    const lat2 = this.toRad(to.latitude)

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distanceKm = R * c

    // Assume average speed of 60 km/h for duration estimate
    const durationHours = distanceKm / 60

    return {
      distance: {
        kilometers: Math.round(distanceKm * 10) / 10,
        miles: Math.round(distanceKm * 0.621371 * 10) / 10
      },
      duration: {
        minutes: Math.round(durationHours * 60),
        hours: Math.round(durationHours * 10) / 10
      }
    }
  }

  // Helper function to convert degrees to radians
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Calculate service price based on route and package details
  calculateServicePrice(
    serviceType: ServiceType,
    distance: number,
    volume: number,
    weight: number,
    palletCount: number = 0,
    isRushDelivery: boolean = false
  ): number {
    const rates = SERVICE_RATES[serviceType]

    // For intra-city deliveries (less than 50km), use a simplified calculation
    if (distance <= 50) {
      const baseAmount = rates.basePrice + 
        (volume * rates.perM3) +
        (weight * rates.perTon) +
        (palletCount * rates.perPallet)
      
      // Apply rush factor if it's a rush delivery
      const rushMultiplier = isRushDelivery ? rates.rushFactor : 1.0
      
      // Round to nearest $100
      return Math.ceil(baseAmount * rushMultiplier / 100) * 100
    }

    // For longer distances, include per-kilometer rates
    const baseAmount = rates.basePrice + 
      (distance * rates.perKm) + 
      (volume * rates.perM3) +
      (weight * rates.perTon) +
      (palletCount * rates.perPallet)
    
    // Apply rush factor if it's a rush delivery
    const rushMultiplier = isRushDelivery ? rates.rushFactor : 1.0
    
    // Round to nearest $1000
    return Math.ceil(baseAmount * rushMultiplier / 1000) * 1000
  }

  // Calculate delivery time based on distance and service type
  calculateDeliveryTime(distance: number, speedFactor: number, handlingHours: number): string {
    // Base calculation: assume average speed of 80 km/h
    const travelHours = distance / 80
    
    // Apply speed factor and add handling time (varies by service level)
    const totalHours = (travelHours * speedFactor) + handlingHours
    
    // Convert to business days (8 hours per business day)
    const businessDays = Math.ceil(totalHours / 8)
    
    // Format the delivery time estimate
    if (businessDays <= 1) {
      if (totalHours <= 4) {
        return "Same day delivery"
      } else {
        return "Next business day"
      }
    } else if (businessDays === 2) {
      return "2 business days"
    } else {
      return `${businessDays} business days`
    }
  }

  // Calculate all service options for a given route and package
  calculateServiceOptions(route: RouteInfo | null, packageDetails: {
    volume: string;
    weight: string;
    palletCount?: string;
  }): ServiceOption[] {
    if (!route) return []

    const volume = parseFloat(packageDetails.volume) || 0
    const weight = parseFloat(packageDetails.weight) || 0
    const palletCount = parseInt(packageDetails.palletCount || '0') || 0
    const isRushDelivery = route.duration.hours < 24 // Consider it rush delivery if less than 24 hours

    return [
      {
        id: 'express_freight',
        name: 'Express Freight',
        price: this.calculateServicePrice(
          'express_freight',
          route.distance.kilometers,
          volume,
          weight,
          palletCount,
          isRushDelivery
        ),
        duration: this.calculateDeliveryTime(
          route.distance.kilometers,
          SERVICE_RATES.express_freight.speedFactor,
          2
        ),
        description: 'Priority handling and expedited transport'
      },
      {
        id: 'standard_freight',
        name: 'Standard Freight',
        price: this.calculateServicePrice(
          'standard_freight',
          route.distance.kilometers,
          volume,
          weight,
          palletCount,
          isRushDelivery
        ),
        duration: this.calculateDeliveryTime(
          route.distance.kilometers,
          SERVICE_RATES.standard_freight.speedFactor,
          8
        ),
        description: 'Regular service with standard handling'
      },
      {
        id: 'eco_freight',
        name: 'Eco Freight',
        price: this.calculateServicePrice(
          'eco_freight',
          route.distance.kilometers,
          volume,
          weight,
          palletCount,
          isRushDelivery
        ),
        duration: this.calculateDeliveryTime(
          route.distance.kilometers,
          SERVICE_RATES.eco_freight.speedFactor,
          16
        ),
        description: 'Cost-effective with consolidated handling'
      }
    ]
  }

  // Calculate estimated delivery date based on pickup date and service type
  calculateEstimatedDelivery(pickupDate: string, serviceType: ServiceType): string {
    const pickup = new Date(pickupDate)
    let daysToAdd: number

    switch (serviceType) {
      case 'express_freight':
        daysToAdd = 2
        break
      case 'standard_freight':
        daysToAdd = 4
        break
      case 'eco_freight':
        daysToAdd = 6
        break
    }

    // Add business days to pickup date
    const delivery = new Date(pickup)
    let remainingDays = daysToAdd
    while (remainingDays > 0) {
      delivery.setDate(delivery.getDate() + 1)
      if (delivery.getDay() !== 0 && delivery.getDay() !== 6) { // Skip weekends
        remainingDays--
      }
    }

    return delivery.toISOString().split('T')[0]
  }
}

export const quoteCalculationService = new QuoteCalculationService() 