export interface QuoteRequest {
  id: string
  title: string
  customer: {
    id: string
    name: string
    email: string
  }
  metadata: {
    packageDetails: {
      type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight'
      weight: string
      volume: string
      containerSize?: '20ft' | '40ft' | '40ft_hc'
      palletCount?: string
      hazardous: boolean
      specialRequirements: string
    }
    destination: {
      from: string
      to: string
      pickupDate: string
    }
    selectedService?: string
    quotedPrice?: number
  }
  status: string
  created_at: string
} 