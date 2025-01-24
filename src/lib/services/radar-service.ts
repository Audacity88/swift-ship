import type { RadarAddress } from '@/types/quote'

const RADAR_API_URL = 'https://api.radar.io/v1'
const RADAR_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY

interface RadarGeocodeResponse {
  addresses: Array<{
    latitude: number
    longitude: number
    formattedAddress: string
    country: string
    countryCode: string
    countryFlag: string
    city: string
    state: string
    stateCode: string
    postalCode: string
  }>
}

interface RadarAutocompleteResponse {
  addresses: Array<{
    formattedAddress: string
    placeId: string
  }>
}

interface RadarDistanceResponse {
  routes: {
    distance: {
      value: number // Distance in meters
      text: string
    }
    duration: {
      value: number // Duration in seconds
      text: string
    }
    geometry: {
      coordinates: [number, number][]
    }
  }[]
}

export interface RouteInfo {
  distance: {
    kilometers: number
    miles: number
  }
  duration: {
    minutes: number
    hours: number
  }
}

class RadarService {
  private headers: HeadersInit

  constructor() {
    if (!RADAR_PUBLISHABLE_KEY) {
      throw new Error('Radar publishable key is not configured')
    }

    this.headers = {
      'Authorization': RADAR_PUBLISHABLE_KEY,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Get address suggestions as user types
   */
  async autocompleteAddress(query: string): Promise<string[]> {
    try {
      if (!query || query.length < 3) return []

      const response = await fetch(`${RADAR_API_URL}/search/autocomplete?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: this.headers,
        cache: 'no-cache'
      })

      if (!response.ok) {
        console.error('Radar API Error:', {
          status: response.status,
          statusText: response.statusText
        })
        throw new Error('Failed to fetch address suggestions')
      }

      const data = await response.json() as RadarAutocompleteResponse
      return data.addresses.map(address => address.formattedAddress)
    } catch (error) {
      console.error('Error in autocompleteAddress:', error)
      return []
    }
  }

  /**
   * Geocode an address to get coordinates and formatted address details
   */
  async geocodeAddress(address: string): Promise<RadarAddress | null> {
    try {
      const response = await fetch(`${RADAR_API_URL}/geocode/forward?query=${encodeURIComponent(address)}`, {
        method: 'GET',
        headers: this.headers,
        cache: 'no-cache'
      })

      if (!response.ok) {
        console.error('Radar API Error:', {
          status: response.status,
          statusText: response.statusText
        })
        throw new Error('Failed to geocode address')
      }

      const data = await response.json() as RadarGeocodeResponse
      
      if (data.addresses && data.addresses.length > 0) {
        const result = data.addresses[0]
        return {
          formattedAddress: result.formattedAddress,
          country: result.country,
          countryCode: result.countryCode,
          countryFlag: result.countryFlag,
          city: result.city,
          state: result.state,
          stateCode: result.stateCode,
          postalCode: result.postalCode,
          latitude: result.latitude,
          longitude: result.longitude
        }
      }
      
      return null
    } catch (error) {
      console.error('Error in geocodeAddress:', error)
      return null
    }
  }

  /**
   * Reverse geocode coordinates to get address details
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<RadarAddress | null> {
    try {
      const response = await fetch(
        `${RADAR_API_URL}/geocode/reverse?coordinates=${latitude},${longitude}`,
        { 
          method: 'GET',
          headers: this.headers,
          cache: 'no-cache'
        }
      )

      if (!response.ok) {
        console.error('Radar API Error:', {
          status: response.status,
          statusText: response.statusText
        })
        throw new Error('Failed to reverse geocode coordinates')
      }

      const data = await response.json() as RadarGeocodeResponse
      
      if (data.addresses && data.addresses.length > 0) {
        const result = data.addresses[0]
        return {
          formattedAddress: result.formattedAddress,
          country: result.country,
          countryCode: result.countryCode,
          countryFlag: result.countryFlag,
          city: result.city,
          state: result.state,
          stateCode: result.stateCode,
          postalCode: result.postalCode,
          latitude: result.latitude,
          longitude: result.longitude
        }
      }
      
      return null
    } catch (error) {
      console.error('Error in reverseGeocode:', error)
      return null
    }
  }

  /**
   * Calculate distance and estimated duration between two points
   */
  async calculateRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): Promise<RouteInfo | null> {
    try {
      // Validate coordinates
      if (!this.isValidCoordinate(origin.latitude, origin.longitude) || 
          !this.isValidCoordinate(destination.latitude, destination.longitude)) {
        console.error('Invalid coordinates provided:', { origin, destination })
        return null
      }

      // Format coordinates to 6 decimal places for consistency
      const originStr = `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}`
      const destinationStr = `${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`

      const response = await fetch(
        `${RADAR_API_URL}/route/matrix?` + new URLSearchParams({
          origins: originStr,
          destinations: destinationStr,
          mode: 'car',
          units: 'metric'
        }),
        {
          method: 'GET',
          headers: this.headers,
          cache: 'no-cache'
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Radar API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(`Failed to calculate route: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.matrix && data.matrix.length > 0 && data.matrix[0].length > 0) {
        const route = data.matrix[0][0]
        const distanceInKm = route.distance.value / 1000 // Convert meters to kilometers
        const durationInMinutes = route.duration.value / 60 // Convert seconds to minutes

        return {
          distance: {
            kilometers: Math.round(distanceInKm * 10) / 10, // Round to 1 decimal place
            miles: Math.round(distanceInKm * 0.621371 * 10) / 10
          },
          duration: {
            minutes: Math.round(durationInMinutes),
            hours: Math.round(durationInMinutes / 60 * 10) / 10
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Error calculating route:', error)
      return null
    }
  }

  private isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' && 
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    )
  }
}

export const radarService = new RadarService() 