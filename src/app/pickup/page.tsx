'use client'

import { useState, useEffect } from 'react'
import { Package, MapPin, Calendar, Plus } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { pickupService, authService, type PickupTicket } from '@/lib/services'

interface TimeSlot {
  start: string
  end: string
  available: boolean
}

const TIME_SLOTS: TimeSlot[] = [
  { start: '09:00 AM', end: '11:00 AM', available: true },
  { start: '11:00 AM', end: '01:00 PM', available: false },
  { start: '01:00 PM', end: '03:00 PM', available: true },
  { start: '03:00 PM', end: '05:00 PM', available: true },
  { start: '05:00 PM', end: '07:00 PM', available: false },
]

export default function PickupPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [tickets, setTickets] = useState<PickupTicket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [address, setAddress] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [packageType, setPackageType] = useState('full_truckload')
  const [weight, setWeight] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const loadPickups = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const pickups = await pickupService.getPickups({})
      setTickets(pickups)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const createPickup = async () => {
    if (!selectedDate || !selectedTimeSlot || !address) {
      setError('Please fill in all required fields')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const session = await authService.getSession({})
      if (!session?.user?.id) {
        throw new Error('Must be logged in')
      }

      const formattedDate = format(selectedDate, 'yyyy-MM-dd')
      const pickupDateTime = `${formattedDate} ${selectedTimeSlot}`

      await pickupService.createPickup({}, {
        address,
        pickupDateTime,
        packageType,
        weight,
        quantity,
        additionalNotes,
        customerId: session.user.id
      })

      setShowForm(false)
      resetForm()
      await loadPickups()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setAddress('')
    setSelectedDate(new Date())
    setSelectedTimeSlot('')
    setPackageType('full_truckload')
    setWeight('')
    setQuantity('1')
    setAdditionalNotes('')
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
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
          <h1 className="text-2xl font-semibold text-gray-900">Pickups</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
            style={{ backgroundColor: COLORS.primary }}
          >
            {showForm ? 'Cancel' : 'Schedule New Pickup'}
          </button>
        </div>

        {showForm && (
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calendar Section */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Select Date & Time</h2>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Package className="w-4 h-4" />
                    </button>
                    <span className="font-medium">
                      {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Package className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm text-gray-500 py-1">
                        {day}
                      </div>
                    ))}
                    {getDaysInMonth().map((date, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`
                          p-2 text-sm rounded-lg
                          ${!isSameMonth(date, currentMonth) ? 'text-gray-300' : 
                            isSameDay(date, selectedDate) ? 'bg-primary text-white' : 
                            'hover:bg-gray-100'
                          }
                        `}
                        disabled={!isSameMonth(date, currentMonth)}
                      >
                        {format(date, 'd')}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Available Time Slots</h3>
                    <div className="space-y-2">
                      {TIME_SLOTS.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedTimeSlot(`${slot.start} - ${slot.end}`)}
                          disabled={!slot.available}
                          className={`
                            w-full p-2 text-left text-sm rounded-lg border
                            ${!slot.available ? 'bg-gray-50 text-gray-400 cursor-not-allowed' :
                              selectedTimeSlot === `${slot.start} - ${slot.end}` ? 'border-primary bg-primary/5' :
                              'border-gray-200 hover:border-primary'
                            }
                          `}
                        >
                          {slot.start} - {slot.end}
                          {!slot.available && <span className="ml-2 text-xs">(Unavailable)</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pickup Details Section */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Pickup Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter complete pickup address"
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes
                    </label>
                    <textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      rows={3}
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="Any special instructions or requirements..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createPickup}
                disabled={!address || !selectedDate || !selectedTimeSlot}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: COLORS.primary }}
              >
                Schedule Pickup
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
              <Package className="w-12 h-12 mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No Pickups Scheduled</p>
              <p className="text-sm text-center">
                You haven't scheduled any pickups yet. Click 'Schedule New Pickup' to get started.
              </p>
            </div>
          ) : (
            tickets.map(pickup => (
              <div
                key={pickup.id}
                className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-medium text-gray-900">{pickup.title}</h2>
                    <p className="text-sm text-gray-600">{pickup.description}</p>
                    {pickup.metadata && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {pickup.metadata.address}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {pickup.metadata.pickupDateTime}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    pickup.status === 'open' ? 'bg-green-100 text-green-700' :
                    pickup.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {pickup.status.replace('_', ' ').charAt(0).toUpperCase() + pickup.status.slice(1)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="w-[400px] bg-white flex flex-col items-center justify-center text-gray-500">
        Select a shipment for details (not implemented)
      </div>
    </div>
  )
} 