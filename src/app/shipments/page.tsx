'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  ArrowRight,
  Loader2
} from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { shipmentService } from '@/lib/services'
import { useAuth } from '@/lib/hooks/useAuth'
import type { ShipmentWithEvents } from '@/types/shipment'

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

export default function ShipmentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [shipments, setShipments] = useState<ShipmentWithEvents[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShipments = async () => {
      if (!user) return
      
      try {
        setIsLoading(true)
        const fetchedShipments = await shipmentService.getCustomerShipments(undefined, user.id)
        
        // Get events for each shipment
        const shipmentsWithEvents = await Promise.all(
          fetchedShipments.map(async (shipment) => {
            const shipmentWithEvents = await shipmentService.getShipmentWithEvents(undefined, shipment.id)
            return shipmentWithEvents
          })
        )
        
        setShipments(shipmentsWithEvents)
      } catch (error) {
        console.error('Error fetching shipments:', error)
        setError('Failed to load shipments. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchShipments()
  }, [user])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Shipments</h1>
      </div>

      <div className="space-y-6">
        {shipments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No shipments yet</h3>
            <p className="text-gray-500 mt-2">Your shipments will appear here once you have any in progress</p>
          </div>
        ) : (
          shipments.map((shipment) => {
            const StatusIcon = statusColors[shipment.status].icon

            return (
              <div
                key={shipment.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusColors[shipment.status].bg} ${statusColors[shipment.status].text}`}>
                          <StatusIcon className="w-4 h-4" />
                          {shipment.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                        {shipment.tracking_number && (
                          <span className="text-sm text-gray-500">
                            Tracking: {shipment.tracking_number}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-4 h-4" />
                          {shipmentTypeLabels[shipment.type]}
                        </div>
                        {shipment.scheduled_pickup && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            Pickup: {format(new Date(shipment.scheduled_pickup), 'MMM d, yyyy')}
                          </div>
                        )}
                        {shipment.estimated_delivery && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            Delivery: {format(new Date(shipment.estimated_delivery), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Package Details */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Package Details</h3>
                      <div className="space-y-2 text-sm">
                        {shipment.metadata.quote_metadata?.packageDetails?.weight && (
                          <p className="text-gray-500">Weight: {shipment.metadata.quote_metadata.packageDetails.weight} metric tons</p>
                        )}
                        {shipment.metadata.quote_metadata?.packageDetails?.volume && (
                          <p className="text-gray-500">Volume: {shipment.metadata.quote_metadata.packageDetails.volume} m³</p>
                        )}
                        {shipment.metadata.quote_metadata?.packageDetails?.containerSize && (
                          <p className="text-gray-500">Container Size: {shipment.metadata.quote_metadata.packageDetails.containerSize}</p>
                        )}
                        {shipment.metadata.quote_metadata?.packageDetails?.palletCount && (
                          <p className="text-gray-500">Pallets: {shipment.metadata.quote_metadata.packageDetails.palletCount}</p>
                        )}
                        {shipment.metadata.quote_metadata?.packageDetails?.hazardous && (
                          <p className="text-yellow-600">⚠️ Contains hazardous materials</p>
                        )}
                      </div>
                    </div>

                    {/* Route Details */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Route</h3>
                      <div className="flex items-start gap-3">
                        <div className="relative flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          <div className="w-0.5 h-full bg-gray-200 absolute top-2" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{shipment.origin}</p>
                          <p className="text-sm text-gray-500">Origin</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{shipment.destination}</p>
                          <p className="text-sm text-gray-500">Destination</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Last Event */}
                  {shipment.events && shipment.events.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">Last Event</h3>
                      <div>
                        {(() => {
                          const lastEvent = shipment.events[0]
                          const EventIcon = statusColors[lastEvent.status].icon

                          return (
                            <div className="flex items-start gap-3">
                              <div className="relative flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full ${statusColors[lastEvent.status].bg} flex items-center justify-center`}>
                                  <EventIcon className={`w-4 h-4 ${statusColors[lastEvent.status].text}`} />
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {lastEvent.status === 'quote_requested' 
                                    ? 'Shipment Created'
                                    : lastEvent.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </p>
                                {lastEvent.status === 'quote_requested' ? (
                                  <p className="text-sm text-gray-500">Quote accepted and preparing for shipment</p>
                                ) : (
                                  <>
                                    {lastEvent.location && (
                                      <p className="text-sm text-gray-500">{lastEvent.location}</p>
                                    )}
                                    {lastEvent.notes && (
                                      <p className="text-sm text-gray-500">{lastEvent.notes}</p>
                                    )}
                                  </>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {format(new Date(lastEvent.created_at), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <button
                      onClick={() => router.push(`/shipments/${shipment.id}`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}