'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays } from 'date-fns'
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Package,
  Clock,
  DollarSign,
  ChevronRight,
  Pencil,
  Trash2,
  X
} from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { quoteService, shipmentService, ticketService } from '@/lib/services'
import { useAuth } from '@/lib/hooks/useAuth'
import { QuoteDetailView } from '@/components/features/quotes/QuoteDetailView'
import { TIME_SLOTS } from '@/types/time-slots'
import { AddressAutocomplete } from '@/components/features/quotes/AddressAutocomplete'
import type { RadarAddress } from '@/types/quote'
import { radarService, type RouteInfo } from '@/lib/services/radar-service'

type Step = 'package' | 'destination' | 'service' | 'summary' | 'done'

interface PackageDetails {
  type: 'full_truckload' | 'less_than_truckload' | 'sea_container' | 'bulk_freight'
  weight: string
  volume: string
  containerSize?: '20ft' | '40ft' | '40ft_hc'
  palletCount?: string
  hazardous: boolean
  specialRequirements: string
}

interface Quote {
  id: string
  title: string
  status: string
  createdAt: string
  is_archived: boolean
  metadata: {
    packageDetails: PackageDetails
    destination: {
      from: {
        address: string
        coordinates?: {
          latitude: number
          longitude: number
        }
        formattedAddress?: string
        placeDetails?: RadarAddress
      }
      to: {
        address: string
        coordinates?: {
          latitude: number
          longitude: number
        }
        formattedAddress?: string
        placeDetails?: RadarAddress
      }
      pickupDate: string
      pickupTimeSlot: string
    }
    selectedService: string
    quotedPrice?: number
    estimatedDelivery?: string
  }
}

interface QuoteRequest {
  id: string
  title: string
  status: string
  customer: {
    id: string
    name: string
    email: string
  }
  metadata: {
    packageDetails: PackageDetails
    destination: {
      from: {
        address: string
        coordinates?: {
          latitude: number
          longitude: number
        }
        formattedAddress?: string
        placeDetails?: RadarAddress
      }
      to: {
        address: string
        coordinates?: {
          latitude: number
          longitude: number
        }
        formattedAddress?: string
        placeDetails?: RadarAddress
      }
      pickupDate: string
      pickupTimeSlot: string
    }
    selectedService: string
    quotedPrice?: number
  }
  created_at: string
}

interface ServiceOption {
  id: string
  name: string
  price: number
  duration: string
  description: string
}

interface ValidationErrors {
  pickup?: string
  delivery?: string
  date?: string
  timeSlot?: string
  weight?: string
  volume?: string
  type?: string
  service?: string
}

const initialPackageDetails: PackageDetails = {
  type: 'full_truckload',
  weight: '',
  volume: '',
  containerSize: undefined,
  palletCount: '',
  hazardous: false,
  specialRequirements: ''
}

const initialDestination: {
  from: {
    address: string
    coordinates?: {
      latitude: number
      longitude: number
    }
    formattedAddress?: string
    placeDetails?: RadarAddress
  }
  to: {
    address: string
    coordinates?: {
      latitude: number
      longitude: number
    }
    formattedAddress?: string
    placeDetails?: RadarAddress
  }
  pickupDate: string
  pickupTimeSlot: string
} = {
  from: {
    address: '',
  },
  to: {
    address: '',
  },
  pickupDate: '',
  pickupTimeSlot: '',
}

// Base rates per kilometer for different services
const SERVICE_RATES = {
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

export default function QuotePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [showNewQuoteForm, setShowNewQuoteForm] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [currentStep, setCurrentStep] = useState<Step>('package')
  const [packageDetails, setPackageDetails] = useState<PackageDetails>(initialPackageDetails)
  const [destination, setDestination] = useState<{
    from: {
      address: string
      coordinates?: {
        latitude: number
        longitude: number
      }
      formattedAddress?: string
      placeDetails?: RadarAddress
    }
    to: {
      address: string
      coordinates?: {
        latitude: number
        longitude: number
      }
      formattedAddress?: string
      placeDetails?: RadarAddress
    }
    pickupDate: string
    pickupTimeSlot: string
  }>({
    from: {
      address: '',
    },
    to: {
      address: '',
    },
    pickupDate: '',
    pickupTimeSlot: '',
  })
  const [selectedService, setSelectedService] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)

  const steps: { id: Step; label: string }[] = [
    { id: 'package', label: 'Package Details' },
    { id: 'destination', label: 'Destination' },
    { id: 'service', label: 'Service Selection' },
    { id: 'summary', label: 'Summary' },
    { id: 'done', label: 'Done' }
  ]

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!user) return
      
      try {
        setIsLoadingQuotes(true)
        const fetchedQuotes = await quoteService.fetchQuotes(undefined)
        // Transform QuoteRequest to Quote, ensuring all required fields are present
        const transformedQuotes = fetchedQuotes.map(quote => ({
          id: quote.id,
          title: quote.title,
          status: quote.status,
          createdAt: new Date(quote.created_at).toISOString(),
          is_archived: quote.is_archived || false,
          metadata: {
            packageDetails: {
              type: quote.metadata.packageDetails.type,
              weight: quote.metadata.packageDetails.weight,
              volume: quote.metadata.packageDetails.volume,
              containerSize: quote.metadata.packageDetails.containerSize,
              palletCount: quote.metadata.packageDetails.palletCount,
              hazardous: quote.metadata.packageDetails.hazardous,
              specialRequirements: quote.metadata.packageDetails.specialRequirements
            },
            destination: {
              from: quote.metadata.destination.from,
              to: quote.metadata.destination.to,
              pickupDate: quote.metadata.destination.pickupDate,
              pickupTimeSlot: quote.metadata.destination.pickupTimeSlot || ''
            },
            selectedService: quote.metadata.selectedService || '',
            quotedPrice: quote.metadata.quotedPrice,
            estimatedDelivery: quote.metadata.estimatedDelivery
          }
        }))
        setQuotes(transformedQuotes)
      } catch (error) {
        console.error('Error fetching quotes:', error)
      } finally {
        setIsLoadingQuotes(false)
      }
    }

    void fetchQuotes()
  }, [user])

  // Calculate service options based on distance and volume
  const calculateServiceOptions = (route: RouteInfo | null): ServiceOption[] => {
    if (!route) return []

    const volume = parseFloat(packageDetails.volume) || 0
    const weight = parseFloat(packageDetails.weight) || 0
    const palletCount = parseInt(packageDetails.palletCount || '0') || 0
    const isRushDelivery = route.duration.hours < 24 // Consider it rush delivery if less than 24 hours

    const calculatePrice = (rates: typeof SERVICE_RATES.express_freight) => {
      // For intra-city deliveries (less than 50km), use a simplified calculation
      if (route.distance.kilometers <= 50) {
        const baseAmount = rates.basePrice + 
          (volume * rates.perM3) +
          (weight * rates.perTon) +
          (palletCount * rates.perPallet)
        
        // Apply rush factor if it's a rush delivery
        const rushMultiplier = isRushDelivery ? rates.rushFactor : 1.0
        
        // Round to nearest $1000
        return Math.ceil(baseAmount * rushMultiplier / 1000) * 1000
      }

      // For longer distances, include per-kilometer rates
      const baseAmount = rates.basePrice + 
        (route.distance.kilometers * rates.perKm) + 
        (volume * rates.perM3) +
        (weight * rates.perTon) +
        (palletCount * rates.perPallet)
      
      // Apply rush factor if it's a rush delivery
      const rushMultiplier = isRushDelivery ? rates.rushFactor : 1.0
      
      // Round to nearest $1000
      return Math.ceil(baseAmount * rushMultiplier / 1000) * 1000
    }

    // Calculate business days based on distance and speed
    const calculateDeliveryTime = (speedFactor: number, handlingHours: number): string => {
      // Base calculation: assume average speed of 80 km/h
      const travelHours = route.distance.kilometers / 80
      
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

    return [
      {
        id: 'express_freight',
        name: 'Express Freight',
        price: calculatePrice(SERVICE_RATES.express_freight),
        duration: calculateDeliveryTime(SERVICE_RATES.express_freight.speedFactor, 2), // 2 hours handling
        description: 'Priority handling and expedited transport'
      },
      {
        id: 'standard_freight',
        name: 'Standard Freight',
        price: calculatePrice(SERVICE_RATES.standard_freight),
        duration: calculateDeliveryTime(SERVICE_RATES.standard_freight.speedFactor, 8), // 1 business day handling
        description: 'Regular service with standard handling'
      },
      {
        id: 'eco_freight',
        name: 'Eco Freight',
        price: calculatePrice(SERVICE_RATES.eco_freight),
        duration: calculateDeliveryTime(SERVICE_RATES.eco_freight.speedFactor, 16), // 2 business days handling
        description: 'Cost-effective with consolidated handling'
      }
    ]
  }

  // Calculate route when origin and destination coordinates are available
  useEffect(() => {
    const calculateDistance = async () => {
      // Clear route info when coordinates change
      setRouteInfo(null)

      // Check if we have valid coordinates
      if (!destination.from.coordinates || !destination.to.coordinates) {
        console.log('Missing coordinates for route calculation')
        return
      }

      console.log('Calculating route with coordinates:', {
        from: destination.from.coordinates,
        to: destination.to.coordinates
      })

      try {
        const route = await radarService.calculateRoute(
          destination.from.coordinates,
          destination.to.coordinates
        )

        if (route) {
          console.log('Route calculated successfully:', route)
          setRouteInfo(route)
        } else {
          console.error('Failed to calculate route - no route returned')
          // Fallback to approximate straight-line distance calculation
          const fallbackRoute = calculateFallbackRoute(
            destination.from.coordinates,
            destination.to.coordinates
          )
          console.log('Using fallback route calculation:', fallbackRoute)
          setRouteInfo(fallbackRoute)
        }
      } catch (error) {
        console.error('Error calculating route:', error)
        // Fallback to approximate straight-line distance calculation
        const fallbackRoute = calculateFallbackRoute(
          destination.from.coordinates,
          destination.to.coordinates
        )
        console.log('Using fallback route calculation after error:', fallbackRoute)
        setRouteInfo(fallbackRoute)
      }
    }

    void calculateDistance()
  }, [destination.from.coordinates, destination.to.coordinates])

  // Fallback route calculation using straight-line distance (Haversine formula)
  const calculateFallbackRoute = (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): RouteInfo => {
    const R = 6371 // Earth's radius in kilometers

    const dLat = toRad(to.latitude - from.latitude)
    const dLon = toRad(to.longitude - from.longitude)
    const lat1 = toRad(from.latitude)
    const lat2 = toRad(to.latitude)

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
  const toRad = (degrees: number): number => {
    return degrees * (Math.PI / 180)
  }

  const handleNext = () => {
    const errors: ValidationErrors = {}

    // Validate current step
    if (currentStep === 'package') {
      if (!packageDetails.type) {
        errors.type = 'Please select a shipment type'
      }
      if (!packageDetails.weight) {
        errors.weight = 'Please enter the weight'
      }
      if (!packageDetails.volume) {
        errors.volume = 'Please enter the volume'
      }
      if (parseFloat(packageDetails.volume) < 0) {
        errors.volume = 'Volume cannot be negative'
      }
      if (parseFloat(packageDetails.weight) < 0) {
        errors.weight = 'Weight cannot be negative'
      }
    } else if (currentStep === 'destination') {
      if (!destination.from.address) {
        errors.pickup = 'Please enter a pickup location'
      }
      if (!destination.to.address) {
        errors.delivery = 'Please enter a delivery location'
      }
      if (!destination.pickupDate) {
        errors.date = 'Please select a pickup date'
      }
      if (!destination.pickupTimeSlot) {
        errors.timeSlot = 'Please select a pickup time slot'
      }
    } else if (currentStep === 'service') {
      if (!selectedService) {
        errors.service = 'Please select a service option'
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setError('Please fill in all required fields')
      return
    }

    setValidationErrors({})
    setError(null)
    const stepOrder: Step[] = ['package', 'destination', 'service', 'summary', 'done']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const stepOrder: Step[] = ['package', 'destination', 'service', 'summary', 'done']
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  const handleSubmitQuote = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (!user) {
        throw new Error('You must be signed in to request a quote.')
      }

      // Gather all form data in metadata
      const metadata = {
        packageDetails,
        destination,
        selectedService,
        estimatedDelivery: calculateEstimatedDelivery(
          destination.pickupDate,
          selectedService
        )
      }

      if (selectedQuote) {
        // Update existing quote using ticketService since it's a ticket under the hood
        await ticketService.updateTicket(undefined, selectedQuote.id, {
          metadata
        })
        setSuccessMessage('Your quote has been updated successfully.')
      } else {
        // Create new quote
        await quoteService.createQuoteRequest(undefined, {
          title: 'Quote Request',
          description: 'New quote request from customer portal',
          customerId: user.id,
          metadata
        })
        setSuccessMessage('Your quote request has been submitted.')
      }

      setCurrentStep('done')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote)
    setShowNewQuoteForm(true)
    // Pre-fill the form with existing data
    setPackageDetails(quote.metadata.packageDetails)
    setDestination(quote.metadata.destination)
    setSelectedService(quote.metadata.selectedService)
    setCurrentStep('package')
  }

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote request?')) return
    if (!user) return

    try {
      setIsDeleting(true)
      // Update ticket status to CLOSED and mark as archived
      await ticketService.updateTicket(undefined, quoteId, {
        status: 'closed',
        is_archived: true,
        updated_by: user.id
      })
      
      setQuotes(prevQuotes => prevQuotes.map(q => 
        q.id === quoteId ? { ...q, status: 'closed', is_archived: true } : q
      ))
    } catch (error) {
      console.error('Error deleting quote:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Helper function to calculate estimated delivery based on service type
  const calculateEstimatedDelivery = (pickupDate: string, serviceId: string): string => {
    const pickup = new Date(pickupDate)
    const service = calculateServiceOptions(routeInfo).find(s => s.id === serviceId)
    
    if (!service) return ''

    // Extract the number of days from the duration string (e.g., "2-3 Business Days" -> 3)
    const maxDays = parseInt(service.duration.match(/\d+/g)?.pop() || '0')
    
    // Add business days to pickup date
    const delivery = new Date(pickup)
    let daysToAdd = maxDays
    while (daysToAdd > 0) {
      delivery.setDate(delivery.getDate() + 1)
      if (delivery.getDay() !== 0 && delivery.getDay() !== 6) { // Skip weekends
        daysToAdd--
      }
    }

    return delivery.toISOString().split('T')[0]
  }

  // Transform quote to QuoteRequest type
  const transformQuoteToQuoteRequest = (quote: Quote): QuoteRequest => {
    return {
      id: quote.id,
      title: quote.title,
      status: quote.status,
      customer: {
        id: user?.id || '',
        name: user?.name || '',
        email: user?.email || ''
      },
      metadata: {
        ...quote.metadata,
        // Add any missing required fields with defaults
        packageDetails: {
          type: quote.metadata.packageDetails.type,
          weight: quote.metadata.packageDetails.weight,
          volume: quote.metadata.packageDetails.volume,
          containerSize: quote.metadata.packageDetails.containerSize,
          palletCount: quote.metadata.packageDetails.palletCount,
          hazardous: quote.metadata.packageDetails.hazardous,
          specialRequirements: quote.metadata.packageDetails.specialRequirements
        },
        destination: {
          from: quote.metadata.destination.from,
          to: quote.metadata.destination.to,
          pickupDate: quote.metadata.destination.pickupDate,
          pickupTimeSlot: quote.metadata.destination.pickupTimeSlot || ''
        },
        selectedService: quote.metadata.selectedService || '',
        quotedPrice: quote.metadata.quotedPrice
      },
      created_at: quote.createdAt
    }
  }

  // Handle create shipment from quote
  const handleCreateShipment = async (quoteId: string) => {
    if (!user) return

    try {
      // Find the quote data
      const quote = quotes.find(q => q.id === quoteId)
      if (!quote) {
        throw new Error('Quote not found')
      }

      // Ensure we have all required data
      if (!quote.metadata.destination.from || !quote.metadata.destination.to) {
        throw new Error('Missing origin or destination address')
      }

      const shipmentData = {
        quote_id: quoteId,
        type: quote.metadata.packageDetails.type,
        origin: quote.metadata.destination.from.formattedAddress || quote.metadata.destination.from.address,
        destination: quote.metadata.destination.to.formattedAddress || quote.metadata.destination.to.address,
        scheduled_pickup: quote.metadata.destination.pickupDate,
        estimated_delivery: quote.metadata.estimatedDelivery || calculateEstimatedDelivery(
          quote.metadata.destination.pickupDate, 
          quote.metadata.selectedService
        ),
        customer_id: user.id
      }

      console.log('Sending shipment creation request:', shipmentData)

      // Create the shipment
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shipmentData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to create shipment:', errorData)
        throw new Error(errorData.error || 'Failed to create shipment')
      }

      const data = await response.json()

      // Update the ticket status
      const ticketResponse = await fetch(`/api/tickets/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'in_progress',
          metadata: {
            isShipment: true,
            shipmentStatus: 'created',
            createdAt: new Date().toISOString()
          }
        })
      })

      if (!ticketResponse.ok) {
        const error = await ticketResponse.json()
        throw new Error(error.message || 'Failed to update ticket')
      }

      // Redirect to shipments page
      router.push('/shipments')
    } catch (error) {
      console.error('Error creating shipment:', error)
      setError(error instanceof Error ? error.message : 'Failed to create shipment')
    }
  }

  if (isLoadingQuotes) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {!showNewQuoteForm ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">My Quotes</h1>
            <button
              onClick={() => {
                setSelectedQuote(null)
                setShowNewQuoteForm(true)
                setPackageDetails(initialPackageDetails)
                setDestination(initialDestination)
                setSelectedService('')
                setCurrentStep('package')
              }}
              className="px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Plus className="w-4 h-4" />
              New Quote
            </button>
          </div>

          <div className="space-y-4">
            {quotes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No quotes yet</h3>
                <p className="text-gray-500 mt-2">Create your first quote request to get started</p>
              </div>
            ) : (
              quotes
                .filter(quote => !quote.is_archived)
                .sort((a, b) => {
                  // Sort in_progress quotes to the top
                  if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
                  if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
                  // Then sort by creation date (newest first)
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((quote) => (
                  <QuoteDetailView
                    key={quote.id}
                    quote={transformQuoteToQuoteRequest(quote)}
                    onCreateShipment={quote.status === 'in_progress' ? handleCreateShipment : undefined}
                    onEditQuote={quote.status === 'open' ? () => {
                      setSelectedQuote(quote)
                      setShowNewQuoteForm(true)
                      setPackageDetails(quote.metadata.packageDetails)
                      setDestination(quote.metadata.destination)
                      setSelectedService(quote.metadata.selectedService || '')
                      setCurrentStep('package')
                    } : undefined}
                    onDeleteQuote={handleDeleteQuote}
                    mode={quote.metadata.quotedPrice ? 'quoted' : 'pending'}
                    isDeleting={isDeleting}
                  />
                ))
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Form Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              {selectedQuote ? 'Edit Quote' : 'New Quote'}
            </h1>
            <button
              onClick={() => {
                setShowNewQuoteForm(false)
                setSelectedQuote(null)
                setPackageDetails(initialPackageDetails)
                setDestination(initialDestination)
                setSelectedService('')
                setCurrentStep('package')
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Progress Steps */}
          {currentStep !== 'done' && (
            <div className="mb-8">
              <div className="flex justify-between">
                {steps.map((step, index) => {
                  const isActive = currentStep === step.id
                  const isCompleted = steps.findIndex(s => s.id === currentStep) > index

                  return (
                    <div key={step.id} className="flex flex-col items-center w-full">
                      <div className="relative flex items-center justify-center w-full">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center \
                            ${isActive || isCompleted ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}
                          style={isActive || isCompleted ? { backgroundColor: COLORS.primary } : {}}
                        >
                          {index + 1}
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`${isCompleted ? 'bg-primary' : 'bg-gray-200'} h-[2px] flex-1 mx-4`} />
                        )}
                      </div>
                      <span className={`mt-2 text-sm font-medium ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-500 mb-4">{error}</div>
          )}
          {successMessage && currentStep !== 'done' && (
            <div className="text-green-500 mb-4">{successMessage}</div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {currentStep === 'package' && (
              <div className="space-y-6">
  
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipment Type
                    </label>
                    <select
                      value={packageDetails.type}
                      onChange={(e) => setPackageDetails({ ...packageDetails, type: e.target.value as any })}
                      className={`w-full p-2 border rounded-lg ${validationErrors.type ? 'border-red-500' : 'border-gray-200'}`}
                    >
                      <option value="full_truckload">Full Truckload (FTL)</option>
                      <option value="less_than_truckload">Less Than Truckload (LTL)</option>
                      <option value="sea_container">Sea Container</option>
                      <option value="bulk_freight">Bulk Freight</option>
                    </select>
                    {validationErrors.type && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.type}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Weight (metric tons)
                    </label>
                    <input
                      type="number"
                      value={packageDetails.weight}
                      onChange={(e) => setPackageDetails({ ...packageDetails, weight: e.target.value })}
                      className={`w-full p-2 border rounded-lg ${validationErrors.weight ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Enter weight in metric tons"
                    />
                    {validationErrors.weight && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.weight}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Volume (cubic meters)
                    </label>
                    <input
                      type="number"
                      value={packageDetails.volume}
                      onChange={(e) => setPackageDetails({ ...packageDetails, volume: e.target.value })}
                      className={`w-full p-2 border rounded-lg ${validationErrors.volume ? 'border-red-500' : 'border-gray-200'}`}
                      placeholder="Enter volume in cubic meters"
                    />
                    {validationErrors.volume && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.volume}</p>
                    )}
                  </div>
                  {packageDetails.type === 'sea_container' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Container Size
                      </label>
                      <select
                        value={packageDetails.containerSize}
                        onChange={(e) => setPackageDetails({ ...packageDetails, containerSize: e.target.value as any })}
                        className="w-full p-2 border border-gray-200 rounded-lg"
                      >
                        <option value="20ft">20ft Standard</option>
                        <option value="40ft">40ft Standard</option>
                        <option value="40ft_hc">40ft High Cube</option>
                      </select>
                    </div>
                  )}
                  {(packageDetails.type === 'full_truckload' || packageDetails.type === 'less_than_truckload') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Pallets
                      </label>
                      <input
                        type="number"
                        value={packageDetails.palletCount}
                        onChange={(e) => setPackageDetails({ ...packageDetails, palletCount: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg"
                        placeholder="Enter number of pallets"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <input
                        type="checkbox"
                        checked={packageDetails.hazardous}
                        onChange={(e) => setPackageDetails({ ...packageDetails, hazardous: e.target.checked })}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Hazardous Materials
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Check if your shipment contains any hazardous materials requiring special handling
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requirements
                    </label>
                    <textarea
                      value={packageDetails.specialRequirements}
                      onChange={(e) => setPackageDetails({ ...packageDetails, specialRequirements: e.target.value })}
                      rows={3}
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="Enter any special handling requirements, temperature control needs, or other important details"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'destination' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Pickup & Delivery Details</h2>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Location
                    </label>
                    <AddressAutocomplete
                      value={destination.from.address}
                      onChange={(address, details) => {
                        setDestination(prev => ({
                          ...prev,
                          from: {
                            address,
                            coordinates: details ? {
                              latitude: details.latitude,
                              longitude: details.longitude
                            } : undefined,
                            formattedAddress: details?.formattedAddress,
                            placeDetails: details
                          }
                        }))
                        setValidationErrors(prev => ({ ...prev, pickup: undefined }))
                      }}
                      placeholder="Enter pickup address"
                      error={validationErrors.pickup}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Location
                    </label>
                    <AddressAutocomplete
                      value={destination.to.address}
                      onChange={(address, details) => {
                        setDestination(prev => ({
                          ...prev,
                          to: {
                            address,
                            coordinates: details ? {
                              latitude: details.latitude,
                              longitude: details.longitude
                            } : undefined,
                            formattedAddress: details?.formattedAddress,
                            placeDetails: details
                          }
                        }))
                        setValidationErrors(prev => ({ ...prev, delivery: undefined }))
                      }}
                      placeholder="Enter delivery address"
                      error={validationErrors.delivery}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      value={destination.pickupDate}
                      onChange={(e) => {
                        setDestination({ ...destination, pickupDate: e.target.value })
                        setValidationErrors(prev => ({ ...prev, date: undefined }))
                      }}
                      className={`w-full p-2 border rounded-lg ${validationErrors.date ? 'border-red-500' : 'border-gray-200'}`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {validationErrors.date && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Pickup Time
                    </label>
                    <select
                      value={destination.pickupTimeSlot}
                      onChange={(e) => {
                        setDestination({ ...destination, pickupTimeSlot: e.target.value })
                        setValidationErrors(prev => ({ ...prev, timeSlot: undefined }))
                      }}
                      className={`w-full p-2 border rounded-lg ${validationErrors.timeSlot ? 'border-red-500' : 'border-gray-200'}`}
                    >
                      <option value="">Select a time slot</option>
                      {TIME_SLOTS.map((slot) => (
                        <option 
                          key={slot.id} 
                          value={slot.id}
                          disabled={!slot.available}
                        >
                          {slot.label}
                          {!slot.available && ' (Unavailable)'}
                        </option>
                      ))}
                    </select>
                    {validationErrors.timeSlot && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.timeSlot}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'service' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Select Service</h2>
                
                {routeInfo ? (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                      <div className="flex items-center justify-between text-blue-700">
                        <div>
                          <p className="font-medium">Estimated Distance</p>
                          <p className="text-sm">{routeInfo.distance.kilometers} km ({routeInfo.distance.miles} miles)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Shipment Details</p>
                          <p className="text-sm">
                            {packageDetails.weight} tons • {packageDetails.volume} m³
                            {packageDetails.palletCount ? ` • ${packageDetails.palletCount} pallets` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {calculateServiceOptions(routeInfo).map((service) => (
                        <div
                          key={service.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedService === service.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-200'
                          }`}
                          onClick={() => setSelectedService(service.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-medium">{service.name}</h3>
                            <div className="text-right">
                              <p className="text-lg font-medium">~${service.price.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">Estimated Price*</p>
                            </div>
                          </div>
                          <p className="text-gray-600 mb-2">{service.description}</p>
                          <p className="text-sm text-gray-500">Estimated delivery time: {service.duration}</p>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-4">
                      *Prices are estimates based on distance, weight, volume, and number of pallets. 
                      Final price may vary based on actual shipment details and conditions.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Calculating route and service options...</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'summary' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Package Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="font-medium">Type:</span> {packageDetails.type}</p>
                    <p><span className="font-medium">Weight:</span> {packageDetails.weight}</p>
                    <p><span className="font-medium">Volume:</span> {packageDetails.volume}</p>
                    {packageDetails.containerSize && (
                      <p><span className="font-medium">Container Size:</span> {packageDetails.containerSize}</p>
                    )}
                    {packageDetails.palletCount && (
                      <p><span className="font-medium">Pallet Count:</span> {packageDetails.palletCount}</p>
                    )}
                    <p><span className="font-medium">Hazardous:</span> {packageDetails.hazardous ? 'Yes' : 'No'}</p>
                    {packageDetails.specialRequirements && (
                      <p><span className="font-medium">Special Requirements:</span> {packageDetails.specialRequirements}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Destination Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="font-medium">From:</span> {destination.from.address}</p>
                    <p><span className="font-medium">To:</span> {destination.to.address}</p>
                    <p><span className="font-medium">Pickup Date:</span> {format(new Date(destination.pickupDate), 'PPP')}</p>
                    <p>
                      <span className="font-medium">Pickup Time:</span>{' '}
                      {TIME_SLOTS.find(slot => slot.id === destination.pickupTimeSlot)?.label || 'Not selected'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Service</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {selectedService && (
                      <>
                        <p>
                          <span className="font-medium">Service:</span>{' '}
                          {calculateServiceOptions(routeInfo).find(option => option.id === selectedService)?.name}
                        </p>
                        <p>
                          <span className="font-medium">Duration:</span>{' '}
                          {calculateServiceOptions(routeInfo).find(option => option.id === selectedService)?.duration}
                        </p>
                        <p>
                          <span className="font-medium">Price:</span> $
                          {calculateServiceOptions(routeInfo).find(option => option.id === selectedService)?.price.toFixed(2)}
                        </p>
                        <p>
                          <span className="font-medium">Estimated Delivery:</span>{' '}
                          {format(new Date(calculateEstimatedDelivery(destination.pickupDate, selectedService)), 'PPP')}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {currentStep !== 'done' && (
              <div className="flex justify-between mt-8">
                {currentStep !== 'package' && (
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 rounded-lg border border-gray-200 font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </div>
                  </button>
                )}
                
                {currentStep === 'summary' ? (
                  <button
                    className="px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2"
                    style={{ backgroundColor: COLORS.primary }}
                    onClick={handleSubmitQuote}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : (
                      <>
                        {selectedQuote ? 'Update Quote' : 'Submit Request'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              )}
            {/* )} */}
            
          </div>

          {currentStep === 'done' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Thank you!</h2>
              <p className="text-gray-700">Your quote request has been submitted.</p>
              {successMessage && (
                <p className="text-green-500 mt-2">{successMessage}</p>
              )}
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowNewQuoteForm(false)
                    void router.refresh()
                  }}
                  className="px-6 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  View All Quotes
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 