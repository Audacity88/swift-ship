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

interface Destination {
  from: string
  to: string
  pickupDate: string
}

interface ServiceOption {
  id: string
  name: string
  price: number
  duration: string
  description: string
}

interface Quote {
  id: string
  title: string
  status: string
  createdAt: string
  is_archived: boolean
  metadata: {
    packageDetails: PackageDetails
    destination: Destination
    selectedService: string
    quotedPrice?: number
  }
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

const initialDestination: Destination = {
  from: '',
  to: '',
  pickupDate: '',
}

const serviceOptions: ServiceOption[] = [
  {
    id: 'express_freight',
    name: 'Express Freight',
    price: 2499.99,
    duration: '2-3 Business Days',
    description: 'Dedicated truck with priority routing and handling',
  },
  {
    id: 'standard_freight',
    name: 'Standard Freight',
    price: 1499.99,
    duration: '5-7 Business Days',
    description: 'Regular service with optimized routing',
  },
  {
    id: 'eco_freight',
    name: 'Eco Freight',
    price: 999.99,
    duration: '7-10 Business Days',
    description: 'Cost-effective option with consolidated shipments',
  },
]

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
  const [destination, setDestination] = useState<Destination>(initialDestination)
  const [selectedService, setSelectedService] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        // Transform QuoteRequest to Quote, ensuring selectedService is always present
        const transformedQuotes = fetchedQuotes.map(quote => ({
          id: quote.id,
          title: quote.title,
          status: quote.status,
          createdAt: new Date(quote.created_at).toISOString(),
          is_archived: quote.is_archived,
          metadata: {
            ...quote.metadata,
            selectedService: quote.metadata.selectedService || ''  // Ensure it's never undefined
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

  const handleNext = () => {
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
        selectedService
      }

      if (selectedQuote) {
        // Update existing quote using ticketService since it's a ticket under the hood
        await ticketService.updateTicket(undefined, selectedQuote.id, {
          metadata
        })
        setSuccessMessage('Your quote has been updated successfully.')
      } else {
        // Create new quote
        const ticket = await quoteService.createQuoteRequest(undefined, {
          title: 'Quote Request',
          description: 'New quote request from customer portal',
          customerId: user.id,
          metadata
        })

        // Create shipment from quote
        await shipmentService.createFromQuote(undefined, ticket.id, user.id)
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
    const service = serviceOptions.find(s => s.id === serviceId)
    
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
                  <div
                    key={quote.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{quote.title}</h3>
                        <p className="text-sm text-gray-500">
                          From {quote.metadata.destination.from} to {quote.metadata.destination.to}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {quote.status === 'in_progress' && (
                          <button
                            onClick={() => router.push(`/shipments/new?quoteId=${quote.id}`)}
                            className="px-3 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                          >
                            Select Pickup
                          </button>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${quote.status === 'open' ? 'bg-blue-100 text-blue-800' :
                            quote.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'}`}
                        >
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                        <div className="flex items-center gap-2">
                          {quote.status === 'open' && (
                            <>
                              <button
                                onClick={() => handleEditQuote(quote)}
                                className="p-1 rounded-lg hover:bg-gray-100"
                                title="Edit quote"
                              >
                                <Pencil className="w-4 h-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuote(quote.id)}
                                className="p-1 rounded-lg hover:bg-gray-100"
                                title="Delete quote"
                                disabled={isDeleting}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </>
                          )}
                          {quote.status === 'in_progress' && (
                            <button
                              onClick={() => handleDeleteQuote(quote.id)}
                              className="p-1 rounded-lg hover:bg-gray-100"
                              title="Delete quote"
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Package className="w-4 h-4" />
                        {quote.metadata.packageDetails.type.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                      </div>
                      {quote.metadata.quotedPrice && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <DollarSign className="w-4 h-4" />
                          ${quote.metadata.quotedPrice.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
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

          {error && (
            <div className="text-red-500 mb-4">{error}</div>
          )}
          {successMessage && (
            <div className="text-green-500 mb-4">{successMessage}</div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {currentStep === 'package' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Cargo Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipment Type
                    </label>
                    <select
                      value={packageDetails.type}
                      onChange={(e) => setPackageDetails({ ...packageDetails, type: e.target.value as any })}
                      className="w-full p-2 border border-gray-200 rounded-lg"
                    >
                      <option value="full_truckload">Full Truckload (FTL)</option>
                      <option value="less_than_truckload">Less Than Truckload (LTL)</option>
                      <option value="sea_container">Sea Container</option>
                      <option value="bulk_freight">Bulk Freight</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Weight (metric tons)
                    </label>
                    <input
                      type="number"
                      value={packageDetails.weight}
                      onChange={(e) => setPackageDetails({ ...packageDetails, weight: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="Enter weight in metric tons"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Volume (cubic meters)
                    </label>
                    <input
                      type="number"
                      value={packageDetails.volume}
                      onChange={(e) => setPackageDetails({ ...packageDetails, volume: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="Enter volume in m³"
                    />
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
                <h2 className="text-xl font-semibold">Pickup &amp; Delivery</h2>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Address
                    </label>
                    <input
                      type="text"
                      value={destination.from}
                      onChange={(e) => setDestination({ ...destination, from: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="Enter pickup zip code (or country if outside US)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      value={destination.to}
                      onChange={(e) => setDestination({ ...destination, to: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="Enter delivery zip code (or country if outside US)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Planned Pickup Date
                    </label>
                    <input
                      type="date"
                      value={destination.pickupDate}
                      onChange={(e) => setDestination({ ...destination, pickupDate: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'service' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">Select Service</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    These are estimated costs. Final pricing will be confirmed after our team reviews your cargo details.
                  </p>
                </div>
                <div className="space-y-4">
                  {serviceOptions.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service.id)}
                      className={`w-full p-4 rounded-lg border text-left transition-all \
                        ${selectedService === service.id
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-gray-200 hover:border-gray-300'}`}
                      style={selectedService === service.id ? { borderColor: COLORS.primary } : {}}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          <p className="text-sm text-gray-500">{service.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-semibold">~${service.price}</span>
                          <p className="text-xs text-gray-500">Estimated cost</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Estimated delivery: {service.duration}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <p className="text-sm text-blue-700">
                    Note: Final pricing may vary based on factors such as fuel surcharges, exact weight/dimensions, route specifics, and special handling requirements.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 'summary' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Quote Summary</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Cargo Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">Type:</span>
                      <span>{packageDetails.type.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className="text-gray-500">Weight:</span>
                      <span>{packageDetails.weight} metric tons</span>
                      <span className="text-gray-500">Volume:</span>
                      <span>{packageDetails.volume} m³</span>
                      {packageDetails.containerSize && (
                        <>
                          <span className="text-gray-500">Container:</span>
                          <span>{packageDetails.containerSize.replace('_', ' ').toUpperCase()}</span>
                        </>
                      )}
                      {packageDetails.palletCount && (
                        <>
                          <span className="text-gray-500">Pallets:</span>
                          <span>{packageDetails.palletCount}</span>
                        </>
                      )}
                      <span className="text-gray-500">Hazardous:</span>
                      <span>{packageDetails.hazardous ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Shipping Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">From:</span>
                      <span>{destination.from}</span>
                      <span className="text-gray-500">To:</span>
                      <span>{destination.to}</span>
                      <span className="text-gray-500">Pickup Date:</span>
                      <span>{destination.pickupDate}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Selected Service</h3>
                    {selectedService && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-500">Service:</span>
                        <span>{serviceOptions.find(s => s.id === selectedService)?.name}</span>
                        <span className="text-gray-500">Duration:</span>
                        <span>{serviceOptions.find(s => s.id === selectedService)?.duration}</span>
                        <span className="text-gray-500">Price:</span>
                        <span className="font-medium">
                          ${serviceOptions.find(s => s.id === selectedService)?.price}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
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