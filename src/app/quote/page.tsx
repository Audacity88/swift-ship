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
  weight: string
  length: string
  width: string
  height: string
  type: 'document' | 'parcel' | 'freight'
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
  weight: '',
  length: '',
  width: '',
  height: '',
  type: 'parcel',
}

const initialDestination: Destination = {
  from: '',
  to: '',
  pickupDate: '',
}

const serviceOptions: ServiceOption[] = [
  {
    id: 'express',
    name: 'Express Delivery',
    price: 149.99,
    duration: '1-2 Business Days',
    description: 'Fastest delivery option with priority handling',
  },
  {
    id: 'standard',
    name: 'Standard Shipping',
    price: 79.99,
    duration: '3-5 Business Days',
    description: 'Reliable delivery at a standard rate',
  },
  {
    id: 'economy',
    name: 'Economy',
    price: 49.99,
    duration: '5-7 Business Days',
    description: 'Cost-effective option for non-urgent deliveries',
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
    // create a new ticket with type = 'task', tags = ['quote'], store form data in metadata
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
      const { data, error: createError } = await supabase
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
      const ticketId = data.id

      // Insert tag 'quote'
      await supabase
        .from('ticket_tags')
        .insert({
          ticket_id: ticketId,
          tag_id: (await ensureTag('quote')).id
        })

      // Insert a message so it shows up in the inbox for the user
      // We'll mark author_type = 'agent' with author_id = '00000000-0000-0000-0000-000000000000'
      await supabase
        .from('messages')
        .insert({
          ticket_id: ticketId,
          content: 'Your quote request has been received!',
          author_type: 'agent',
          author_id: '00000000-0000-0000-0000-000000000000'
        })

      setSuccessMessage('Your quote request has been submitted. We will get back to you soon.')
      setCurrentStep('done')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
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
              <h2 className="text-xl font-semibold">Package Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Package Type
                  </label>
                  <select
                    value={packageDetails.type}
                    onChange={(e) => setPackageDetails({ ...packageDetails, type: e.target.value as any })}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                  >
                    <option value="document">Document</option>
                    <option value="parcel">Parcel</option>
                    <option value="freight">Freight</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={packageDetails.weight}
                    onChange={(e) => setPackageDetails({ ...packageDetails, weight: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-lg"
                    placeholder="Enter weight"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions (cm)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="number"
                      value={packageDetails.length}
                      onChange={(e) => setPackageDetails({ ...packageDetails, length: e.target.value })}
                      className="p-2 border border-gray-200 rounded-lg"
                      placeholder="Length"
                    />
                    <input
                      type="number"
                      value={packageDetails.width}
                      onChange={(e) => setPackageDetails({ ...packageDetails, width: e.target.value })}
                      className="p-2 border border-gray-200 rounded-lg"
                      placeholder="Width"
                    />
                    <input
                      type="number"
                      value={packageDetails.height}
                      onChange={(e) => setPackageDetails({ ...packageDetails, height: e.target.value })}
                      className="p-2 border border-gray-200 rounded-lg"
                      placeholder="Height"
                    />
                  </div>
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
                    placeholder="Enter pickup address"
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
                    placeholder="Enter delivery address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Date
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
              <h2 className="text-xl font-semibold">Select Service</h2>
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
                      <span className="text-lg font-semibold">${service.price}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Estimated delivery: {service.duration}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'summary' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Quote Summary</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Package Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span>{packageDetails.type}</span>
                    <span className="text-gray-500">Weight:</span>
                    <span>{packageDetails.weight} kg</span>
                    <span className="text-gray-500">Dimensions:</span>
                    <span>{packageDetails.length} × {packageDetails.width} × {packageDetails.height} cm</span>
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