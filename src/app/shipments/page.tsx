'use client'

import { useState } from 'react'
import { 
  Search, Filter, Download, MoreVertical, Package, 
  Truck, MapPin, Calendar, ArrowUpDown
} from 'lucide-react'
import Image from 'next/image'
import { COLORS } from '@/lib/constants'

interface Shipment {
  id: string
  customer: {
    name: string
    avatar: string
  }
  origin: string
  destination: string
  status: 'In Transit' | 'Delivered' | 'Processing' | 'On Hold'
  date: string
  eta: string
  type: string
  priority: 'High' | 'Medium' | 'Low'
}

const shipments: Shipment[] = [
  {
    id: 'SHP001',
    customer: {
      name: 'John Smith',
      avatar: 'https://picsum.photos/200',
    },
    origin: 'New York, USA',
    destination: 'London, UK',
    status: 'In Transit',
    date: '2024-01-19',
    eta: '2024-01-21',
    type: 'Express',
    priority: 'High',
  },
  {
    id: 'SHP002',
    customer: {
      name: 'Sarah Johnson',
      avatar: 'https://picsum.photos/201',
    },
    origin: 'Paris, France',
    destination: 'Berlin, Germany',
    status: 'Processing',
    date: '2024-01-19',
    eta: '2024-01-22',
    type: 'Standard',
    priority: 'Medium',
  },
  {
    id: 'SHP003',
    customer: {
      name: 'Mike Wilson',
      avatar: 'https://picsum.photos/202',
    },
    origin: 'Tokyo, Japan',
    destination: 'Seoul, South Korea',
    status: 'Delivered',
    date: '2024-01-18',
    eta: '2024-01-20',
    type: 'Economy',
    priority: 'Low',
  },
]

const statusColors = {
  'In Transit': COLORS.primary,
  'Delivered': COLORS.success,
  'Processing': COLORS.warning,
  'On Hold': COLORS.negative,
}

const priorityColors = {
  'High': COLORS.negative,
  'Medium': COLORS.warning,
  'Low': COLORS.success,
}

export default function ShipmentsPage() {
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [sortField, setSortField] = useState<keyof Shipment>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: keyof Shipment) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedShipments = [...shipments].sort((a, b) => {
    if (sortDirection === 'asc') {
      return a[sortField] > b[sortField] ? 1 : -1
    }
    return a[sortField] < b[sortField] ? 1 : -1
  })

  return (
    <div className="flex h-[calc(100vh-5rem)] -mt-6 -mx-6">
      {/* Shipments List */}
      <div className="flex-1 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Shipments</h1>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 \
                rounded-lg text-sm font-medium hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium"
                style={{ backgroundColor: COLORS.primary }}>
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search shipments..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-6 py-3 border-b border-gray-200 bg-gray-50">
          {[
            { label: 'ID', field: 'id' },
            { label: 'Customer', field: 'customer' },
            { label: 'Destination', field: 'destination' },
            { label: 'Status', field: 'status' },
            { label: 'Date', field: 'date' },
          ].map((column) => (
            <button
              key={column.field}
              onClick={() => handleSort(column.field as keyof Shipment)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500"
            >
              {column.label}
              <ArrowUpDown className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Shipments List */}
        <div className="flex-1 overflow-auto">
          {sortedShipments.map((shipment) => (
            <button
              key={shipment.id}
              onClick={() => setSelectedShipment(shipment)}
              className={`w-full grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-6 py-4 border-b \
                border-gray-100 hover:bg-gray-50 text-left \
                ${selectedShipment?.id === shipment.id ? 'bg-gray-50' : ''}`}
            >
              <span className="font-medium">{shipment.id}</span>
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8">
                  <Image
                    src={shipment.customer.avatar}
                    alt={shipment.customer.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <span>{shipment.customer.name}</span>
              </div>
              <span className="text-gray-600">{shipment.destination}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${statusColors[shipment.status]}20`,
                  color: statusColors[shipment.status],
                }}>
                {shipment.status}
              </span>
              <span className="text-gray-600">{shipment.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shipment Details */}
      <div className="w-[400px] bg-white flex flex-col">
        {selectedShipment ? (
          <>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Shipment Details</h2>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreVertical className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  <Image
                    src={selectedShipment.customer.avatar}
                    alt={selectedShipment.customer.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{selectedShipment.customer.name}</h3>
                  <p className="text-sm text-gray-500">{selectedShipment.id}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-auto">
              {/* Status and Priority */}
              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Status</span>
                  <div className="mt-1">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${statusColors[selectedShipment.status]}20`,
                        color: statusColors[selectedShipment.status],
                      }}>
                      {selectedShipment.status}
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Priority</span>
                  <div className="mt-1">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${priorityColors[selectedShipment.priority]}20`,
                        color: priorityColors[selectedShipment.priority],
                      }}>
                      {selectedShipment.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipment Info */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <span className="block text-sm text-gray-600">Service Type</span>
                    <span className="font-medium">{selectedShipment.type}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <span className="block text-sm text-gray-600">Route</span>
                    <span className="font-medium">{selectedShipment.origin}</span>
                    <span className="block text-sm text-gray-600 mt-1">To</span>
                    <span className="font-medium">{selectedShipment.destination}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <span className="block text-sm text-gray-600">Date</span>
                    <span className="font-medium">{selectedShipment.date}</span>
                    <span className="block text-sm text-gray-600 mt-1">ETA</span>
                    <span className="font-medium">{selectedShipment.eta}</span>
                  </div>
                </div>
              </div>

              {/* Tracking Timeline */}
              <div>
                <h4 className="font-medium mb-4">Tracking History</h4>
                <div className="space-y-6">
                  {[
                    { 
                      status: 'Package Picked Up',
                      location: 'New York Facility',
                      date: '2024-01-19 09:30 AM',
                    },
                    {
                      status: 'In Transit',
                      location: 'JFK International Airport',
                      date: '2024-01-19 02:45 PM',
                    },
                    {
                      status: 'Customs Clearance',
                      location: 'London Heathrow Airport',
                      date: '2024-01-20 08:15 AM',
                    },
                  ].map((event, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" 
                          style={{ backgroundColor: COLORS.primary }} />
                        {index < 2 && (
                          <div className="absolute top-3 bottom-0 left-1/2 w-px bg-gray-200 -translate-x-1/2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <p className="font-medium">{event.status}</p>
                        <p className="text-sm text-gray-600">{event.location}</p>
                        <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a shipment to view details
          </div>
        )}
      </div>
    </div>
  )
} 