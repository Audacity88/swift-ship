'use client'

import { CustomField } from './CustomField'
import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValueWithId } from '@/types/custom-field'

interface CustomFieldsSectionProps {
  fields: CustomFieldDefinition[]
  values: CustomFieldValueWithId[]
  onChange: (values: CustomFieldValueWithId[]) => void
  readOnly?: boolean
  className?: string
}

export function CustomFieldsSection({
  fields,
  values,
  onChange,
  readOnly = false,
  className = ''
}: CustomFieldsSectionProps) {
  const handleFieldChange = (fieldId: string, value: CustomFieldValue) => {
    const newValues = [...values]
    const index = newValues.findIndex((v) => v.fieldId === fieldId)
    
    if (index !== -1) {
      newValues[index] = { fieldId, value }
    } else {
      newValues.push({ fieldId, value })
    }
    
    onChange(newValues)
  }

  // Sort fields by display order
  const sortedFields = [...fields].sort((a, b) => a.displayOrder - b.displayOrder)

  return (
    <div className={`space-y-4 ${className}`}>
      {sortedFields.map((field) => (
        <CustomField
          key={field.id}
          field={field}
          value={values.find((v) => v.fieldId === field.id)?.value}
          onChange={(value) => handleFieldChange(field.id, value)}
          readOnly={readOnly || !field.isActive}
        />
      ))}
    </div>
  )
} 