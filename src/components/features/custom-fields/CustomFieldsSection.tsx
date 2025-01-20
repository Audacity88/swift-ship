'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Edit2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { CustomField, CustomFieldValue } from '@/types/custom-field'
import type { ChangeEvent } from 'react'

interface CustomFieldsSectionProps {
  ticketId: string
  fields: Array<{
    field_id: string
    value: CustomFieldValue
  }>
  className?: string
}

export function CustomFieldsSection({
  ticketId,
  fields,
  className = ''
}: CustomFieldsSectionProps) {
  // State
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [values, setValues] = useState<Record<string, CustomFieldValue>>({})
  const [editingField, setEditingField] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load custom field definitions
  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        const response = await fetch('/api/custom-fields').then(res => res.json())
        setCustomFields(response.data)

        // Initialize values
        const initialValues: Record<string, CustomFieldValue> = {}
        fields.forEach(field => {
          initialValues[field.field_id] = field.value
        })
        setValues(initialValues)
      } catch (error) {
        console.error('Failed to load custom fields:', error)
        setError('Failed to load custom field definitions')
      }
    }

    loadCustomFields()
  }, [fields])

  // Handle field update
  const handleFieldUpdate = async (fieldId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/custom-fields/${fieldId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: values[fieldId]
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update field')
      }

      setEditingField(null)
    } catch (error) {
      console.error('Failed to update field:', error)
      setError(error instanceof Error ? error.message : 'Failed to update field')
    } finally {
      setIsLoading(false)
    }
  }

  // Render field value
  const renderFieldValue = (field: CustomField) => {
    const value = values[field.id]
    if (value === null || value === undefined) return '-'

    switch (field.type) {
      case 'text':
      case 'number':
      case 'email':
      case 'url':
        return String(value)

      case 'textarea':
        return (
          <div className="whitespace-pre-wrap">{String(value)}</div>
        )

      case 'select':
        return field.options?.find(opt => opt.value === value)?.label || '-'

      case 'date':
        return value instanceof Date ? format(value, 'PP') : format(new Date(value as string), 'PP')

      case 'boolean':
        return (value as boolean) ? 'Yes' : 'No'

      default:
        return '-'
    }
  }

  // Render field editor
  const renderFieldEditor = (field: CustomField) => {
    const value = values[field.id]

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <Input
            type={field.type}
            value={value as string || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValues(prev => ({
              ...prev,
              [field.id]: e.target.value
            }))}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value as number || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValues(prev => ({
              ...prev,
              [field.id]: Number(e.target.value)
            }))}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={value as string || ''}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setValues(prev => ({
              ...prev,
              [field.id]: e.target.value
            }))}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
            rows={4}
          />
        )

      case 'select':
        return (
          <Select
            value={value as string || ''}
            onValueChange={(newValue: string) => setValues(prev => ({
              ...prev,
              [field.id]: newValue
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.name.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                {value ? (
                  format(value instanceof Date ? value : new Date(value as string), 'PP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value instanceof Date ? value : value ? new Date(value as string) : undefined}
                onSelect={(date) => setValues(prev => ({
                  ...prev,
                  [field.id]: date || null
                }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case 'boolean':
        return (
          <Select
            value={(value as boolean)?.toString() || 'false'}
            onValueChange={(newValue: string) => setValues(prev => ({
              ...prev,
              [field.id]: newValue === 'true'
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        )

      default:
        return null
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="font-medium">Custom Fields</h3>
      <div className="space-y-4">
        {customFields.map(field => (
          <div key={field.id} className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-700">
                {field.name}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </div>
              <div className="mt-1 text-sm">
                {renderFieldValue(field)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingField(field.id)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>

            {/* Edit Dialog */}
            <Dialog
              open={editingField === field.id}
              onOpenChange={open => !open && setEditingField(null)}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit {field.name}</DialogTitle>
                  <DialogDescription>
                    Update the value for this custom field
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {renderFieldEditor(field)}

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setEditingField(null)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleFieldUpdate(field.id)}
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </div>
    </div>
  )
} 