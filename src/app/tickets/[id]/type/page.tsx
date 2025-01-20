'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { FileText, AlertCircle, HelpCircle, Tool, Check } from 'lucide-react'
import type { TicketType } from '@/types/ticket'

interface TypeOption {
  type: TicketType
  label: string
  description: string
  icon: typeof FileText
  color: string
}

const typeOptions: TypeOption[] = [
  {
    type: 'problem',
    label: 'Problem',
    description: 'Something is not working as expected',
    icon: AlertCircle,
    color: '#DE350B',
  },
  {
    type: 'question',
    label: 'Question',
    description: 'Further information is requested',
    icon: HelpCircle,
    color: '#00B8D9',
  },
  {
    type: 'task',
    label: 'Task',
    description: 'A task that needs to be completed',
    icon: Tool,
    color: '#36B37E',
  },
  {
    type: 'incident',
    label: 'Incident',
    description: 'A service interruption or degradation',
    icon: AlertCircle,
    color: '#FF991F',
  },
]

const impactLevels = [
  {
    id: '1',
    label: 'Critical',
    description: 'Service is completely down or unusable',
    color: '#DE350B',
  },
  {
    id: '2',
    label: 'Major',
    description: 'Major functionality is impacted',
    color: '#FF991F',
  },
  {
    id: '3',
    label: 'Moderate',
    description: 'Some functionality is impacted',
    color: '#00B8D9',
  },
  {
    id: '4',
    label: 'Minor',
    description: 'Minimal impact on functionality',
    color: '#36B37E',
  },
]

export default function TicketTypePage() {
  const params = useParams()
  const ticketId = params?.id as string
  const [selectedType, setSelectedType] = useState<TicketType>('problem')
  const [selectedImpact, setSelectedImpact] = useState<string>('3')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Handle successful update
    } catch (error) {
      console.error('Failed to update ticket type:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Type Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Ticket Type</h2>
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
                  Update Type
                </>
              )}
            </button>
          </div>

          {/* Type Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedType === option.type
              return (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={isSelected ? { borderColor: option.color } : {}}
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${option.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: option.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-gray-900">{option.label}</h3>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5" style={{ color: option.color }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Impact Assessment */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Impact Assessment</h2>
          <div className="space-y-4">
            {impactLevels.map((level) => {
              const isSelected = selectedImpact === level.id
              return (
                <button
                  key={level.id}
                  onClick={() => setSelectedImpact(level.id)}
                  className={`flex items-center justify-between w-full p-4 rounded-lg \
                    border transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={isSelected ? { borderColor: level.color } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: level.color }}
                    />
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">{level.label}</h3>
                      <p className="text-sm text-gray-500">{level.description}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5" style={{ color: level.color }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Type Details */}
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Type Details</h2>
          {/* Selected Type Info */}
          {(() => {
            const selectedOption = typeOptions.find(opt => opt.type === selectedType)
            const Icon = selectedOption?.icon
            return (
              <div className="space-y-4">
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

                {/* Impact Level */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Impact Level</h4>
                  {(() => {
                    const selectedLevel = impactLevels.find(
                      level => level.id === selectedImpact
                    )
                    return (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedLevel?.color }}
                        />
                        <span className="text-sm text-gray-900">
                          {selectedLevel?.label}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
} 