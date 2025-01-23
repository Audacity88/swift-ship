'use client'

import { useState, useEffect } from 'react'
import { Package, MapPin, Calendar, Plus } from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { pickupService, type PickupTicket } from '@/lib/services'
import { useAuth } from '@/lib/hooks/useAuth'

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
  const { user } = useAuth()
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

    if (!user) {
      setError('Must be logged in')
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd')
      const pickupDateTime = `${formattedDate} ${selectedTimeSlot}`

      await pickupService.createPickup({}, {
        address,
        pickupDateTime,
        packageType,
        weight,
        quantity,
        additionalNotes,
        customerId: user.id
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
                        `