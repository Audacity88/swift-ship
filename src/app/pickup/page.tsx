'use client'

import { useState } from 'react'
import { 
  Calendar as CalendarIcon, Clock, MapPin, Package, 
  ChevronLeft, ChevronRight, Plus, X
} from 'lucide-react'
import { COLORS } from '@/lib/constants'

interface TimeSlot {
  id: string
  time: string
  available: boolean
}

interface PickupRequest {
  date: string
  timeSlot: string
  address: string
  packageDetails: {
    type: string
    weight: string
    quantity: string
  }
  notes: string
}

const timeSlots: TimeSlot[] = [
  { id: '1', time: '09:00 AM - 11:00 AM', available: true },
  { id: '2', time: '11:00 AM - 01:00 PM', available: false },
  { id: '3', time: '01:00 PM - 03:00 PM', available: true },
  { id: '4', time: '03:00 PM - 05:00 PM', available: true },
  { id: '5', time: '05:00 PM - 07:00 PM', available: false },
]

const initialRequest: PickupRequest = {
  date: '',
  timeSlot: '',
  address: '',
  packageDetails: {
    type: 'parcel',
    weight: '',
    quantity: '1',
  },
  notes: '',
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const packageTypes = ['document', 'parcel', 'freight']

export default function PickupPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [request, setRequest] = useState<PickupRequest>(initialRequest)
  const [showForm, setShowForm] = useState(false)

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    
    const days = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate?.toDateString()
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const handleDateSelect = (date: Date) => {
    if (!isPast(date)) {
      setSelectedDate(date)
      setRequest(prev => ({ ...prev, date: date.toISOString().split('T')[0] }))
      setShowForm(true)
    }
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] -mt-6 -mx-6">
      {/* Calendar View */}
      <div className="w-[400px] bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Schedule Pickup</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <span className="font-medium">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
            {getDaysInMonth(currentMonth).map((date, index) => (
              <button
                key={index}
                onClick={() => date && handleDateSelect(date)}
                disabled={date ? isPast(date) : true}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-sm
                  ${!date ? 'invisible' : ''}
                  ${date && isPast(date) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-50'}
                  ${date && isToday(date) ? 'border border-primary text-primary' : ''}
                  ${date && isSelected(date) ? 'bg-primary text-white hover:bg-primary' : ''}
                `}
                style={date && isSelected(date) ? { backgroundColor: COLORS.primary } : {}}
              >
                {date?.getDate()}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Available Time Slots</h3>
          <div className="space-y-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.id}
                disabled={!slot.available}
                onClick={() => setRequest(prev => ({ ...prev, timeSlot: slot.time }))}
                className={`
                  w-full p-3 rounded-lg border text-left transition-colors
                  ${!slot.available 
                    ? 'bg-gray-50 cursor-not-allowed' 
                    : request.timeSlot === slot.time
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                style={request.timeSlot === slot.time ? { borderColor: COLORS.primary } : {}}
              >
                <div className="flex items-center justify-between">
                  <span className={slot.available ? 'font-medium' : 'text-gray-500'}>
                    {slot.time}
                  </span>
                  {!slot.available && (
                    <span className="text-xs text-gray-500">Unavailable</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pickup Form */}
      <div className="flex-1 bg-white">
        {showForm ? (
          <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Pickup Details</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Selected Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Date</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <span>{selectedDate.toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Time Slot</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span>{request.timeSlot || 'Select a time slot'}</span>
                  </div>
                </div>
              </div>

              {/* Pickup Address */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Pickup Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={request.address}
                    onChange={(e) => setRequest(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter pickup address"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Package Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Package Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Type</label>
                    <select
                      value={request.packageDetails.type}
                      onChange={(e) => setRequest(prev => ({
                        ...prev,
                        packageDetails: { ...prev.packageDetails, type: e.target.value }
                      }))}
                      className="mt-1 w-full p-2 border border-gray-200 rounded-lg"
                    >
                      {packageTypes.map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Weight (kg)</label>
                    <input
                      type="number"
                      value={request.packageDetails.weight}
                      onChange={(e) => setRequest(prev => ({
                        ...prev,
                        packageDetails: { ...prev.packageDetails, weight: e.target.value }
                      }))}
                      className="mt-1 w-full p-2 border border-gray-200 rounded-lg"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Quantity</label>
                    <input
                      type="number"
                      value={request.packageDetails.quantity}
                      onChange={(e) => setRequest(prev => ({
                        ...prev,
                        packageDetails: { ...prev.packageDetails, quantity: e.target.value }
                      }))}
                      className="mt-1 w-full p-2 border border-gray-200 rounded-lg"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Additional Notes</label>
                <textarea
                  value={request.notes}
                  onChange={(e) => setRequest(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full p-3 border border-gray-200 rounded-lg resize-none"
                  placeholder="Any special instructions for pickup..."
                />
              </div>

              {/* Submit Button */}
              <button
                className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium \
                  hover:bg-primary/90 transition-colors"
                style={{ backgroundColor: COLORS.primary }}
              >
                Schedule Pickup
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Package className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Schedule a Pickup</h3>
            <p className="text-gray-500 mb-4">Select a date from the calendar to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg \
                font-medium hover:bg-primary/90 transition-colors"
              style={{ backgroundColor: COLORS.primary }}
            >
              <Plus className="w-4 h-4" />
              New Request
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 