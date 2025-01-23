'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/app/providers'
import { Search, Filter, Download, MoreVertical, Package, Truck, MapPin, Calendar, ArrowUpDown, Plus } from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface ShipmentTicket {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  metadata: any
}

export default function ShipmentsPage() {
  const supabase = useSupabase()
  const [isLoading, setIsLoading] = useState(true)
  const [tickets, setTickets] = useState<ShipmentTicket[]>([])
  const [showNew, setShowNew] = useState(false)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadShipments = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_tags!inner(
            tags!inner(name)
          )
        `)
        .eq('ticket_tags.tags.name', 'shipment')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }
      if (!data) {
        setTickets([])
      } else {
        setTickets(data)
      }
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
      // create a new ticket with tag=shipment
      const sessionRes = await supabase.auth.getSession()
      const session = sessionRes.data.session
      if (!session?.user?.id) {
        throw new Error('Must be logged in')
      }
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: 'Shipment Request',
          description: `Shipment from ${origin} to ${destination}`,
          status: 'open',
          priority: 'medium',
          type: 'task',
          customer_id: session.user.id,
          source: 'web',
          metadata: { origin, destination }
        })
        .select()
        .single()
      if (error) throw error

      const ticketId = data.id

      // Insert tag
      await supabase
        .from('ticket_tags')
        .insert({
          ticket_id: ticketId,
          tag_id: (await ensureTag('shipment')).id
        })

      // Insert system message or user message
      await supabase
        .from('messages')
        .insert({
          ticket_id: ticketId,
          content: 'Your shipment request has been received!',
          author_type: 'agent',
          author_id: '00000000-0000-0000-0000-000000000000'
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

  const ensureTag = async (tagName: string) => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('name', tagName)
      .single()

    if (data) return data

    const { data: newTag, error: createError } = await supabase
      .from('tags')
      .insert({ name: tagName, color: '#0EAD69' })
      .select()
      .single()

    if (createError || !newTag) {
      throw new Error('Failed to ensure tag: ' + tagName)
    }
    return newTag
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
          <h1 className="text-2xl font-semibold text-gray-900">Shipments</h1>
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
          {tickets.map(shipment => (
            <div
              key={shipment.id}
              className="w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50"
            >
              <h2 className="font-medium text-gray-900">{shipment.title}</h2>
              <p className="text-sm text-gray-600">
                {shipment.description}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(shipment.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipment Details */}
      <div className="w-[400px] bg-white flex flex-col items-center justify-center text-gray-500">
        Select a shipment for details (not implemented)
      </div>
    </div>
  )
} 