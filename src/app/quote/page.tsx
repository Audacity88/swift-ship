'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays } from 'date-fns'
import {
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { useSupabase } from '@/app/providers'

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
  const supabase = useSupabase()

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
      const sessionRes = await supabase.auth.getSession()
      const session = sessionRes.data.session
      if (!session?.user?.id) {
        throw new Error('You must be signed in to request a quote.')
      }

      // Gather all form data in metadata
      const metadata = {
        packageDetails,
        destination,
        selectedService
      }

      // Create ticket
      const { data: ticket, error: createError } = await supabase
        .from('tickets')
        .insert({
          title: 'Quote Request',
          description: 'New quote request from customer portal',
          priority: 'medium',
          type: 'task',
          customer_id: session.user.id,
          source: 'web',
          metadata,
          status: 'open'
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }
      const ticketId = ticket.id

      // Insert tag 'quote'
      await supabase
        .from('ticket_tags')
        .insert({
          ticket_id: ticketId,
          tag_id: (await ensureTag('quote')).id
        })

      // Create shipment
      const shipmentData = {
        quote_id: ticketId,
        type: packageDetails.type,
        origin: destination.from,
        destination: destination.to,
        scheduled_pickup: destination.pickupDate ? new Date(destination.pickupDate).toISOString() : null,
        estimated_delivery: selectedService ? calculateEstimatedDelivery(destination.pickupDate, selectedService) : null,
        status: 'quote_requested',
        customer_id: session.user.id,
        metadata: {
          weight: packageDetails.weight,
          volume: packageDetails.volume,
          container_size: packageDetails.containerSize,
          pallet_count: packageDetails.palletCount,
          hazardous: packageDetails.hazardous,
          special_requirements: packageDetails.specialRequirements,
          selected_service: selectedService
        }
      }

      console.log('Creating shipment with data:', shipmentData)

      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shipmentData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Shipment creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(errorData.message || 'Failed to create shipment')
      }

      const shipment = await response.json()
      console.log('Shipment created successfully:', shipment)

      // Insert a message with shipment details
      await supabase
        .from('messages')
        .insert({
          ticket_id: ticketId,
          content: `Your quote request has been received! Your shipment tracking number is: ${shipment.tracking_number}`,
          author_type: 'agent',
          author_id: '00000000-0000-0000-0000-000000000000'
        })

      setSuccessMessage('Your quote request has been submitted.')
      setCurrentStep('done')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
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

  const ensureTag = async (tagName: string) => {
    // check if tag with name = tagName exists, else create
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('name', tagName)
      .single()

    if (data) return data

    const { data: newTag, error: createError } = await supabase
      .from('tags')
      .insert({ name: tagName, color: '#FF5722' })
      .select()
      .single()

    if (createError || !newTag) {
      throw new Error('Failed to ensure tag: ' + tagName)
    }
    return newTag
  }

  return (
    <div className="max-w-4xl mx-auto">
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

      {currentStep !== 'done' && (
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
            {currentStep !== 'package' ? (
              <button
                onClick={handleBack}
                className={`px-6 py-2 rounded-lg border border-gray-200 font-medium`}
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </div>
              </button>
            ) : (
              <div />
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
                    Submit Request
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
      )}

      {currentStep === 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Thank you!</h2>
          <p className="text-gray-700">Your quote request has been submitted.</p>
          {successMessage && (
            <p className="text-green-500 mt-2">{successMessage}</p>
          )}
          <button
            onClick={() => router.push('/inbox')}
            className="mt-6 px-6 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: COLORS.primary }}
          >
            Go to Inbox
          </button>
        </div>
      )}
    </div>
  )
} 