'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, ArrowUp, ArrowDown, Check } from 'lucide-react'
import { TicketPriority } from '@/types/ticket'

interface PriorityOption {
  priority: TicketPriority
  label: string
  description: string
  icon: typeof AlertTriangle
  color: string
  sla: string
}

const priorityOptions: PriorityOption[] = [
  {
    priority: TicketPriority.URGENT,
    label: 'Urgent',
    description: 'Critical issue requiring immediate attention',
    icon: AlertTriangle,
    color: '#DE350B',
    sla: '1 hour',
  },
  {
    priority: TicketPriority.HIGH,
    label: 'High',
    description: 'Serious issue that needs to be resolved quickly',
    icon: ArrowUp,
    color: '#FF991F',
    sla: '4 hours',
  },
  {
    priority: TicketPriority.MEDIUM,
    label: 'Medium',
    description: 'Important issue but not time-critical',
    icon: ArrowUp,
    color: '#00B8D9',
    sla: '24 hours',
  },
  {
    priority: TicketPriority.LOW,
    label: 'Low',
    description: 'Minor issue that can be addressed later',
    icon: ArrowDown,
    color: '#36B37E',
    sla: '48 hours',
  },
]

export default function TicketPriorityPage() {
  const params = useParams()
  const ticketId = params?.id as string
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(TicketPriority.MEDIUM)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Handle successful update
    } catch (error) {
      console.error('Failed to update ticket priority:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Priority Selection */}
      <div className="lg:col-span-2">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Ticket Priority</h2>
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white \
                bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#0052CC' }}
            >
              {isUpdating ? (
                'Updating...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Update Priority
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {priorityOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedPriority === option.priority
              return (
                <button
                  key={option.priority}
                  onClick={() => setSelectedPriority(option.priority)}
                  className={`flex items-center justify-between w-full p-4 rounded-lg \
                    border transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={isSelected ? { borderColor: option.color } : {}}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${option.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: option.color }} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">{option.label}</h3>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-700">Target SLA</span>
                      <p className="text-sm text-gray-500">{option.sla}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5" style={{ color: option.color }} />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Priority Details */}
      <div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Priority Details</h2>
          {(() => {
            const selectedOption = priorityOptions.find(
              opt => opt.priority === selectedPriority
            )
            const Icon = selectedOption?.icon
            return (
              <div className="space-y-6">
                {/* Selected Priority */}
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${selectedOption.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: selectedOption.color }} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedOption?.label}</h3>
                    <p className="text-sm text-gray-500">{selectedOption?.description}</p>
                  </div>
                </div>

                {/* SLA Information */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Service Level Agreement
                  </h4>
                  <p className="text-sm text-gray-900">
                    Target Resolution Time: {selectedOption?.sla}
                  </p>
                </div>

                {/* Priority Guidelines */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Priority Guidelines
                  </h4>
                  <ul className="text-sm text-gray-500 space-y-2">
                    <li>• Consider business impact and urgency</li>
                    <li>• Evaluate number of affected users</li>
                    <li>• Check for workarounds availability</li>
                    <li>• Assess data loss or security risks</li>
                  </ul>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
} 