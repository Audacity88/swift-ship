'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { ticketService } from '@/lib/services'
import { TIME_SLOTS } from '@/types/time-slots'
import type { QuoteRequest } from '@/types/quote'

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
  pickupTimeSlot: string
}

const serviceOptions = [
  {
    id: 'express_freight',
    name: 'Express Freight',
    duration: '2-3 Business Days',
  },
  {
    id: 'standard_freight',
    name: 'Standard Freight',
    duration: '5-7 Business Days',
  },
  {
    id: 'eco_freight',
    name: 'Eco Freight',
    duration: '7-10 Business Days',
  },
]

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [quote, setQuote] = useState<QuoteRequest | null>(null)
  const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(null)
  const [destination, setDestination] = useState<Destination | null>(null)
  const [selectedService, setSelectedService] = useState<string>('')

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const data = await ticketService.getTicket({}, resolvedParams.id)
        // Transform ticket to quote format
        const quoteData: QuoteRequest = {
          id: data.id,
          title: data.title,
          status: data.status,
          customer: {
            id: data.customer.id,
            name: data.customer.name,
            email: data.customer.email
          },
          metadata: data.metadata,
          created_at: data.created_at
        }
        setQuote(quoteData)
        setPackageDetails(data.metadata.packageDetails)
        setDestination(data.metadata.destination)
        setSelectedService(data.metadata.selectedService || '')
      } catch (error) {
        console.error('Error fetching quote:', error)
        toast({
          title: 'Error',
          description: 'Failed to load quote details.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    void fetchQuote()
  }, [resolvedParams.id, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quote || !packageDetails || !destination) return

    try {
      setIsSaving(true)
      await ticketService.updateTicket({}, quote.id, {
        metadata: {
          ...quote.metadata,
          packageDetails,
          destination,
          selectedService
        }
      })

      toast({
        title: 'Success',
        description: 'Quote updated successfully.',
      })

      router.push('/admin/quotes')
    } catch (error) {
      console.error('Error updating quote:', error)
      toast({
        title: 'Error',
        description: 'Failed to update quote.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!quote || !packageDetails || !destination) {
    return (
      <div className="text-center py-12 text-gray-500">
        Quote not found
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/quotes')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-semibold">Edit Quote #{quote.id.slice(0, 8)}</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Package Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Package Details</h2>
              
              <div>
                <Label htmlFor="type">Shipment Type</Label>
                <select
                  id="type"
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
                <Label htmlFor="weight">Weight (metric tons)</Label>
                <Input
                  id="weight"
                  type="text"
                  value={packageDetails.weight}
                  onChange={(e) => setPackageDetails({ ...packageDetails, weight: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="volume">Volume (m³)</Label>
                <Input
                  id="volume"
                  type="text"
                  value={packageDetails.volume}
                  onChange={(e) => setPackageDetails({ ...packageDetails, volume: e.target.value })}
                />
              </div>

              {/* Always show pallet count field */}
              <div>
                <Label htmlFor="palletCount">Number of Pallets</Label>
                <Input
                  id="palletCount"
                  type="text"
                  value={packageDetails.palletCount || ''}
                  onChange={(e) => setPackageDetails({ ...packageDetails, palletCount: e.target.value })}
                  placeholder="Enter number of pallets"
                />
              </div>

              {packageDetails.type === 'sea_container' && (
                <div>
                  <Label htmlFor="containerSize">Container Size</Label>
                  <select
                    id="containerSize"
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hazardous"
                  checked={packageDetails.hazardous}
                  onChange={(e) => setPackageDetails({ ...packageDetails, hazardous: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="hazardous">Hazardous Materials</Label>
              </div>
            </div>

            {/* Destination Details */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Destination Details</h2>
              
              <div>
                <Label htmlFor="from">Pickup Location</Label>
                <Input
                  id="from"
                  type="text"
                  value={destination.from}
                  onChange={(e) => setDestination({ ...destination, from: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="to">Delivery Location</Label>
                <Input
                  id="to"
                  type="text"
                  value={destination.to}
                  onChange={(e) => setDestination({ ...destination, to: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="pickupDate">Pickup Date</Label>
                <Input
                  id="pickupDate"
                  type="date"
                  value={destination.pickupDate}
                  onChange={(e) => setDestination({ ...destination, pickupDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="pickupTimeSlot">Pickup Time Slot</Label>
                <select
                  id="pickupTimeSlot"
                  value={destination.pickupTimeSlot}
                  onChange={(e) => setDestination({ ...destination, pickupTimeSlot: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Select a time slot</option>
                  {TIME_SLOTS.map(slot => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="service">Service Type</Label>
                <select
                  id="service"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Select a service type</option>
                  {serviceOptions.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.duration})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="specialRequirements">Special Requirements</Label>
            <textarea
              id="specialRequirements"
              value={packageDetails.specialRequirements}
              onChange={(e) => setPackageDetails({ ...packageDetails, specialRequirements: e.target.value })}
              rows={3}
              className="w-full p-2 border border-gray-200 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/quotes')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
} 