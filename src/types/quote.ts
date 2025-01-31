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
    estimatedPrice?: number
  }
  status: string
  created_at: string
}

export interface QuoteMetadata {
  isQuote: boolean;
  destination?: {
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
    pickupDate?: string;
    pickupTimeSlot?: string;
  };
  packageDetails?: {
    type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight';
    volume: string;
    weight: string;
    hazardous: boolean;
    palletCount?: string;
    specialRequirements: string;
  };
  selectedService?: 'express_freight' | 'standard_freight' | 'eco_freight';
  estimatedPrice?: number;
  estimatedDelivery?: string;
  route?: {
    distance: {
      kilometers: number;
      miles: number;
    };
    duration: {
      minutes: number;
      hours: number;
    };
  };
  expressPrice?: number;
  standardPrice?: number;
  ecoPrice?: number;
  expressDelivery?: string;
  standardDelivery?: string;
  ecoDelivery?: string;
} 