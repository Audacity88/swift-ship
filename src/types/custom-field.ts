export type CustomFieldType = 'text' | 'number' | 'email' | 'url' | 'textarea' | 'select' | 'date' | 'boolean'

export interface CustomFieldOption {
  value: string
  label: string
}

export interface CustomField {
  id: string
  name: string
  type: CustomFieldType
  description?: string
  required?: boolean
  options?: CustomFieldOption[]
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  }
  metadata?: Record<string, any>
}

export type CustomFieldValue = string | number | boolean | Date | null

export interface CustomFieldDefinition extends CustomField {
  created_at: string
  updated_at: string
  created_by_id: string
  is_system: boolean
  is_archived: boolean
  displayOrder: number
  isActive: boolean
}

export interface CustomFieldValueWithId {
  fieldId: string
  value: CustomFieldValue
}

export type CustomFieldValidation = {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  options?: string[]
  minDate?: string
  maxDate?: string
}

// Type guard to check if a value is valid for a given field type
export const isValidFieldValue = (value: any, type: CustomFieldType): boolean => {
  switch (type) {
    case 'text':
    case 'url':
    case 'email':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number'
    case 'date':
      return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))
    case 'select':
      return typeof value === 'string'
    case 'boolean':
      return typeof value === 'boolean'
    default:
      return false
  }
} 