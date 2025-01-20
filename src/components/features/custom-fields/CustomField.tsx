'use client'

import { useState } from 'react'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import type { CustomField, CustomFieldValue } from '@/types/custom-field'
import type { ChangeEvent } from 'react'

interface CustomFieldProps {
  field: CustomField
  value: CustomFieldValue
  onUpdate: (value: CustomFieldValue) => Promise<void>
  readOnly?: boolean
  className?: string
}

export function CustomField({
  field,
  value,
  onUpdate,
  readOnly = false,
  className = ''
}: CustomFieldProps) {
  // State
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<CustomFieldValue>(value)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle value update
  const handleUpdate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await onUpdate(editValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update field:', error)
      setError(error instanceof Error ? error.message : 'Failed to update field')
    } finally {
      setIsLoading(false)
    }
  }

  // Render field value
  const renderValue = () => {
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
  const renderEditor = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <Input
            type={field.type}
            value={editValue as string || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={editValue as number || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditValue(Number(e.target.value))}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
          />
        )

      case 'textarea':
        return (
          <Textarea
            value={editValue as string || ''}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditValue(e.target.value)}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
            rows={4}
          />
        )

      case 'select':
        return (
          <Select
            value={editValue as string || ''}
            onValueChange={(value: string) => setEditValue(value)}
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
                {editValue ? (
                  format(editValue instanceof Date ? editValue : new Date(editValue as string), 'PP')
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={editValue instanceof Date ? editValue : editValue ? new Date(editValue as string) : undefined}
                onSelect={(date) => setEditValue(date || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case 'boolean':
        return (
          <Select
            value={(editValue as boolean)?.toString() || 'false'}
            onValueChange={(value: string) => setEditValue(value === 'true')}
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-700">
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </div>
          <div className="mt-1 text-sm">
            {renderValue()}
          </div>
        </div>
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={isEditing}
        onOpenChange={open => !open && setIsEditing(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {field.name}</DialogTitle>
            <DialogDescription>
              Update the value for this custom field
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {renderEditor()}

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
              onClick={() => setIsEditing(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
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
  )
} 