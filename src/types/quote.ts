export interface RadarAddress {
  formattedAddress: string
  country: string
  countryCode: string
  countryFlag: string
  city: string
  state: string
  stateCode: string
  postalCode: string
  latitude: number
  longitude: number
}

export interface QuoteDestination {
  from: {
    address: string
    coordinates: {
      latitude: number
      longitude: number
    }
    formattedAddress?: string
    placeDetails?: RadarAddress
  }
  to: {
    address: string
    coordinates: {
      latitude: number
      longitude: number
    }
    formattedAddress?: string
    placeDetails?: RadarAddress
  }
  pickupDate: string
  pickupTimeSlot?: string
}

export interface PackageDetails {
  type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight'
  weight: string
  volume: string
  containerSize?: '20ft' | '40ft' | '40ft_hc'
  palletCount?: string
  hazardous: boolean
  specialRequirements: string
}

export interface QuoteRequest {
  id: string
  title: string
  customer: {
    id: string
    name: string
    email: string
  }
  metadata: {
    packageDetails: PackageDetails
    destination: QuoteDestination
    selectedService?: string
    quotedPrice?: number
  }
  status: string
  created_at: string
} 