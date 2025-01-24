'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  ArrowLeft,
  Loader2,
  Box,
  Info
} from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { shipmentService } from '@/lib/services'
import { useAuth } from '@/lib/hooks/useAuth'
import type { ShipmentWithEvents } from '@/types/shipment'
import { ShipmentMap } from '@/components/features/shipments/ShipmentMap'

const statusColors = {
  quote_requested: { bg: 'bg-blue-50', text: 'text-blue-700', icon: CircleDot },
  quote_provided: { bg: 'bg-blue-50', text: 'text-blue-700', icon: CircleDot },
  quote_accepted: { bg: 'bg-blue-50', text: 'text-blue-700', icon: CircleDot },
  pickup_scheduled: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: Clock },
  pickup_completed: { bg: 'bg-purple-50', text: 'text-purple-700', icon: Package },
  in_transit: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: Truck },
  out_for_delivery: { bg: 'bg-orange-50', text: 'text-orange-700', icon: MapPin },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle }
}

const shipmentTypeLabels = {
  full_truckload: 'Full Truckload (FTL)',
  less_than_truckload: 'Less Than Truckload (LTL)',
  sea_container: 'Sea Container',
  bulk_freight: 'Bulk Freight'
}

export default function ShipmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [shipment, setShipment] = useState<ShipmentWithEvents | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShipment = async () => {
      if (!user || !params.id) return
      
      try {
        setIsLoading(true)
        const fetchedShipment = await shipmentService.getShipmentWithEvents(undefined, params.id as string)
        setShipment(fetchedShipment)
      } catch (error) {
        console.error('Error fetching shipment:', error)
        setError('Failed to load shipment details. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchShipment()
  }, [user, params.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error || !shipment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error || 'Shipment not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  const StatusIcon = statusColors[shipment.status].icon
  const currentLocation = shipment.events?.[0]?.location || 'Location not available'

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Shipment Details</h1>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full ${statusColors[shipment.status].bg} flex items-center justify-center`}>
              <StatusIcon className={`w-6 h-6 ${statusColors[shipment.status].text}`} />
            </div>
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusColors[shipment.status].bg} ${statusColors[shipment.status].text} mb-1`}>
                {shipment.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
              <p className="text-sm text-gray-500">
                Tracking Number: {shipment.tracking_number}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Location</p>
            <p className="font-medium text-gray-900">{currentLocation}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipment Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Shipment Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-medium text-gray-900">{shipmentTypeLabels[shipment.type]}</p>
            </div>
            {shipment.scheduled_pickup && (
              <div>
                <p className="text-sm text-gray-500">Scheduled Pickup</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(shipment.scheduled_pickup), 'PPP p')}
                </p>
              </div>
            )}
            {shipment.estimated_delivery && (
              <div>
                <p className="text-sm text-gray-500">Estimated Delivery</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(shipment.estimated_delivery), 'PPP p')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Package Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Package Details</h2>
          <div className="space-y-4">
            {shipment.metadata.quote_metadata?.packageDetails?.weight && (
              <div>
                <p className="text-sm text-gray-500">Weight</p>
                <p className="font-medium text-gray-900">{shipment.metadata.quote_metadata.packageDetails.weight} metric tons</p>
              </div>
            )}
            {shipment.metadata.quote_metadata?.packageDetails?.volume && (
              <div>
                <p className="text-sm text-gray-500">Volume</p>
                <p className="font-medium text-gray-900">{shipment.metadata.quote_metadata.packageDetails.volume} m³</p>
              </div>
            )}
            {shipment.metadata.quote_metadata?.packageDetails?.palletCount && (
              <div>
                <p className="text-sm text-gray-500">Pallet Count</p>
                <p className="font-medium text-gray-900">{shipment.metadata.quote_metadata.packageDetails.palletCount} pallets</p>
              </div>
            )}
            {shipment.metadata.quote_metadata?.packageDetails?.hazardous !== undefined && (
              <div>
                <p className="text-sm text-gray-500">Hazardous Materials</p>
                <div className={`flex items-center gap-2 font-medium ${shipment.metadata.quote_metadata.packageDetails.hazardous ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {shipment.metadata.quote_metadata.packageDetails.hazardous ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <p>Contains hazardous materials</p>
                    </>
                  ) : (
                    <p>No hazardous materials</p>
                  )}
                </div>
              </div>
            )}
            {shipment.metadata.quote_metadata?.packageDetails?.specialRequirements && (
              <div>
                <p className="text-sm text-gray-500">Special Requirements</p>
                <p className="font-medium text-gray-900">{shipment.metadata.quote_metadata.packageDetails.specialRequirements}</p>
              </div>
            )}
            {shipment.metadata.quote_metadata?.selectedService && (
              <div>
                <p className="text-sm text-gray-500">Selected Service</p>
                <p className="font-medium text-gray-900">
                  {shipment.metadata.quote_metadata.selectedService.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </p>
              </div>
            )}
            {shipment.metadata.quote_metadata?.quotedPrice && (
              <div>
                <p className="text-sm text-gray-500">Quoted Price</p>
                <p className="font-medium text-gray-900">
                  ${shipment.metadata.quote_metadata.quotedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Route Map */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:col-span-2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Route</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <p className="text-sm text-gray-500">Origin</p>
              <p className="font-medium text-gray-900">{shipment.origin}</p>
            </div>
            <Truck className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Destination</p>
              <p className="font-medium text-gray-900">{shipment.destination}</p>
            </div>
          </div>
          <div className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
            <ShipmentMap
              origin={shipment.origin}
              destination={shipment.destination}
              currentLocation={currentLocation}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:col-span-2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Shipment Timeline</h2>
          <div className="space-y-6">
            {shipment.events && shipment.events.length > 0 ? (
              shipment.events.map((event, index) => {
                const EventIcon = statusColors[event.status].icon

                return (
                  <div key={event.id} className="flex items-start gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full ${statusColors[event.status].bg} flex items-center justify-center`}>
                        <EventIcon className={`w-5 h-5 ${statusColors[event.status].text}`} />
                      </div>
                      {index < shipment.events.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 absolute top-10" />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {event.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </p>
                          {event.location && (
                            <p className="text-sm text-gray-500">{event.location}</p>
                          )}
                          {event.notes && (
                            <p className="text-sm text-gray-500 mt-1">{event.notes}</p>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {format(new Date(event.created_at), 'PPP p')}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No events recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 