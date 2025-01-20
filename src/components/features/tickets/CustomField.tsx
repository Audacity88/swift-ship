'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import type { CustomField as CustomFieldType, CustomFieldValue } from '@/types/custom-field'

interface CustomFieldProps {
  field: CustomFieldType
  value?: CustomFieldValue
  onChange: (value: CustomFieldValue) => void
  readOnly?: boolean
  className?: string
}

export function CustomField({ field, value, onChange, readOnly = false, className }: CustomFieldProps) {
  const [currentValue, setCurrentValue] = useState<CustomFieldValue>(value ?? null)

  useEffect(() => {
    setCurrentValue(value ?? null)
  }, [value, field])

  const handleChange = (newValue: CustomFieldValue) => {
    setCurrentValue(newValue)
    onChange(newValue)
  }

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'url':
      case 'email':
        return (
          <Input
            type={field.type}
            value={currentValue?.toString() || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={readOnly}
            placeholder={field.description}
            className={className}
            required={field.required}
            pattern={field.validation?.pattern}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={currentValue?.toString() || ''}
            onChange={(e) => handleChange(Number(e.target.value))}
            disabled={readOnly}
            min={field.validation?.min}
            max={field.validation?.max}
            className={className}
            required={field.required}
          />
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !currentValue && 'text-muted-foreground',
                  className
                )}
                disabled={readOnly}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {currentValue ? format(new Date(currentValue as string), 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentValue ? new Date(currentValue as string) : undefined}
                onSelect={(date) => handleChange(date?.toISOString() || null)}
                disabled={readOnly}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case 'select':
        return (
          <Select
            value={currentValue?.toString() || ''}
            onValueChange={handleChange}
            disabled={readOnly}
          >
            <SelectTrigger className={className}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'boolean':
        return (
          <Checkbox
            checked={currentValue as boolean || false}
            onCheckedChange={handleChange}
            disabled={readOnly}
            className={className}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-muted-foreground">{field.description}</p>
      )}
      {renderField()}
    </div>
  )
} 