'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search, Filter, Download, MoreVertical, Package, Truck, MapPin, Calendar, ArrowUpDown, Plus } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { shipmentService } from '@/lib/services'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Shipment } from '@/types/shipment'

export default function ShipmentsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [totalShipments, setTotalShipments] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadShipments = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await shipmentService.listShipments(undefined)
      setShipments(response.data)
      setTotalShipments(response.total)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const createShipment = async () => {
    setError(null)
    setIsLoading(true)
    try {
      if (!user) {
        throw new Error('Must be logged in')
      }

      await shipmentService.create(undefined, {
        customerId: user.id,
        origin,
        destination,
        status: 'pending'
      })

      setShowNew(false)
      setOrigin('')
      setDestination('')
      // reload
      await loadShipments()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadShipments()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5rem)] -mt-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 p-6">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] -mt-6 -mx-6">
      {/* Shipments List */}
      <div className="flex-1 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Shipments</h1>
            <p className="text-sm text-gray-500 mt-1">Total: {totalShipments}</p>
          </div>
          <button
            className="px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: COLORS.primary }}
            onClick={() => setShowNew(!showNew)}
          >
            {showNew ? 'Cancel' : 'New Shipment'}
          </button>
        </div>

        {showNew && (
          <div className="p-6 border-b border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Enter origin city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Enter destination city"
              />
            </div>
            <button
              onClick={createShipment}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              style={{ backgroundColor: COLORS.primary }}
            >
              Submit Shipment
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {shipments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No shipments found
            </div>
          ) : (
            shipments.map(shipment => (
              <div
                key={shipment.id}
                className="w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50"
              >
                <h2 className="font-medium text-gray-900">{shipment.type}</h2>
                <p className="text-sm text-gray-600">
                  {shipment.origin} to {shipment.destination}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(shipment.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Shipment Details */}
      <div className="w-[400px] bg-white flex flex-col items-center justify-center text-gray-500">
        Select a shipment for details (not implemented)
      </div>
    </div>
  )
} 