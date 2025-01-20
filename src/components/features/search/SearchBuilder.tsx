'use client'

import { useState } from 'react'
import { Plus, X, ChevronDown, Search as SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import type { 
  SearchField, 
  SearchCondition, 
  SearchGroup, 
  SearchOperator 
} from '@/types/search'
import { searchService } from '@/lib/services/search-service'

interface SearchBuilderProps {
  onSearch: (query: SearchGroup) => void
  className?: string
}

export function SearchBuilder({ onSearch, className = '' }: SearchBuilderProps) {
  const [conditions, setConditions] = useState<SearchCondition[]>([])
  const [groupType, setGroupType] = useState<'and' | 'or'>('and')
  const searchFields = searchService.getSearchFields()

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        field: searchFields[0].id,
        operator: searchFields[0].operators[0],
        value: ''
      }
    ])
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index: number, updates: Partial<SearchCondition>) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], ...updates }

    // Reset value when field or operator changes
    if (updates.field || updates.operator) {
      newConditions[index].value = ''
      newConditions[index].valueEnd = undefined
    }

    setConditions(newConditions)
  }

  const handleSearch = () => {
    const query: SearchGroup = {
      type: groupType,
      conditions: conditions
    }
    onSearch(query)
  }

  const renderValueInput = (condition: SearchCondition, index: number) => {
    const field = searchFields.find(f => f.id === condition.field)
    if (!field) return null

    switch (field.type) {
      case 'enum':
        return (
          <Select
            value={condition.value as string}
            onValueChange={(value) => updateCondition(index, { value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.enumValues?.map(value => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'date':
        return (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {condition.value ? new Date(condition.value as string).toLocaleDateString() : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={condition.value ? new Date(condition.value as string) : undefined}
                  onSelect={(date) => updateCondition(index, { value: date?.toISOString() ?? null })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {condition.operator === 'between' && (
              <>
                <span>to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      {condition.valueEnd ? new Date(condition.valueEnd as string).toLocaleDateString() : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={condition.valueEnd ? new Date(condition.valueEnd as string) : undefined}
                      onSelect={(date) => updateCondition(index, { valueEnd: date?.toISOString() ?? null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        )

      case 'number':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={(condition.value as number | '')?.toString() || ''}
              onChange={(e) => updateCondition(index, { value: e.target.value ? Number(e.target.value) : null })}
            />
            {condition.operator === 'between' && (
              <>
                <span>to</span>
                <Input
                  type="number"
                  value={(condition.valueEnd as number | '')?.toString() || ''}
                  onChange={(e) => updateCondition(index, { valueEnd: e.target.value ? Number(e.target.value) : null })}
                />
              </>
            )}
          </div>
        )

      default:
        return (
          <Input
            type="text"
            value={(condition.value as string) || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value || null })}
          />
        )
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Select value={groupType} onValueChange={(value: 'and' | 'or') => setGroupType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">Match All</SelectItem>
            <SelectItem value="or">Match Any</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={addCondition}>
          <Plus className="w-4 h-4 mr-2" />
          Add Condition
        </Button>
      </div>

      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <div key={index} className="flex items-start gap-2">
            <Select
              value={condition.field}
              onValueChange={(value) => updateCondition(index, { field: value })}
            >
              {searchFields.map(field => (
                <SelectItem key={field.id} value={field.id}>
                  {field.name}
                </SelectItem>
              ))}
            </Select>

            <Select
              value={condition.operator}
              onValueChange={(value) => updateCondition(index, { operator: value as SearchOperator })}
            >
              {searchFields
                .find(f => f.id === condition.field)
                ?.operators.map(operator => (
                  <SelectItem key={operator} value={operator}>
                    {operator.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
            </Select>

            {renderValueInput(condition, index)}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeCondition(index)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {conditions.length > 0 && (
        <Button onClick={handleSearch}>
          <SearchIcon className="w-4 h-4 mr-2" />
          Search
        </Button>
      )}
    </div>
  )
} 