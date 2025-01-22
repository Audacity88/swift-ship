'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/app/providers'
import { Package, MapPin, Calendar, Plus } from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface PickupTicket {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  metadata: any
}

export default function PickupPage() {
  const supabase = useSupabase()
  const [isLoading, setIsLoading] = useState(true)
  const [tickets, setTickets] = useState<PickupTicket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [address, setAddress] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [packageDetails, setPackageDetails] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadPickups = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // fetch tickets with tag=pickup
      // do same approach as shipments
      // or we do an approach with a manual join
      const { data, error } = await supabase
        .rpc('get_tickets_by_tag', { tag_name: 'pickup' })

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

  const createPickup = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const sessionRes = await supabase.auth.getSession()
      const session = sessionRes.data.session
      if (!session?.user?.id) {
        throw new Error('Must be logged in')
      }
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: 'Pickup Request',
          description: `Pickup at ${address} on ${pickupDate}`,
          status: 'open',
          priority: 'medium',
          type: 'task',
          customer_id: session.user.id,
          source: 'web',
          metadata: {
            address,
            pickupDate,
            packageDetails
          }
        })
        .select()
        .single()
      if (error) throw error

      const ticketId = data.id
      // Insert tag 'pickup'
      await supabase
        .from('ticket_tags')
        .insert({
          ticket_id: ticketId,
          tag_id: (await ensureTag('pickup')).id
        })

      await supabase
        .from('messages')
        .insert({
          ticket_id: ticketId,
          content: 'Your pickup request has been received!',
          author_type: 'agent',
          author_id: '00000000-0000-0000-0000-000000000000'
        })

      setShowForm(false)
      setAddress('')
      setPickupDate('')
      setPackageDetails('')
      await loadPickups()
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
      .insert({ name: tagName, color: '#FFC107' })
      .select()
      .single()

    if (createError || !newTag) {
      throw new Error('Failed to ensure tag: ' + tagName)
    }
    return newTag
  }

  useEffect(() => {
    void loadPickups()
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
      <div className="text-red-500 p-6">{error}</div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] -mt-6 -mx-6">
      <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Pickup Requests</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
            style={{ backgroundColor: COLORS.primary }}
          >
            {showForm ? 'Cancel' : 'New Pickup'}
          </button>
        </div>

        {showForm && (
          <div className="p-6 border-b border-gray-200 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Pickup Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Pickup Date</label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Package Details</label>
              <textarea
                value={packageDetails}
                onChange={(e) => setPackageDetails(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={createPickup}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              style={{ backgroundColor: COLORS.primary }}
            >
              Submit Pickup
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {tickets.map(pickup => (
            <div
              key={pickup.id}
              className="p-4 border-b border-gray-100 hover:bg-gray-50"
            >
              <h2 className="font-medium text-gray-900">{pickup.title}</h2>
              <p className="text-sm text-gray-600">{pickup.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(pickup.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="w-[400px] bg-white flex flex-col items-center justify-center text-gray-500">
        Select a pickup for details (not implemented)
      </div>
    </div>
  )
} 