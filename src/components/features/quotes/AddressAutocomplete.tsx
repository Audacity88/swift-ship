'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { radarService } from '@/lib/services/radar-service'
import { MapPin } from 'lucide-react'
import type { RadarAddress } from '@/types/quote'

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string, details?: RadarAddress) => void
  placeholder?: string
  className?: string
  error?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address',
  className = '',
  error
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    onChange(value, undefined) // Clear details when input changes
    setIsLoading(true)

    if (value.length >= 3) {
      try {
        const results = await radarService.autocompleteAddress(value)
        setSuggestions(results)
        setIsOpen(true)
      } catch (error) {
        console.error('Error fetching address suggestions:', error)
        setSuggestions([])
      }
    } else {
      setSuggestions([])
      setIsOpen(false)
    }

    setIsLoading(false)
  }

  const handleSuggestionClick = async (suggestion: string) => {
    setInputValue(suggestion)
    setIsOpen(false)
    setIsLoading(true)
    
    try {
      console.log('Geocoding address:', suggestion)
      const details = await radarService.geocodeAddress(suggestion)
      console.log('Geocoding result:', details)
      
      if (details) {
        onChange(suggestion, {
          ...details,
          coordinates: {
            latitude: details.latitude,
            longitude: details.longitude
          }
        })
      } else {
        console.error('No geocoding results found for:', suggestion)
        onChange(suggestion)
      }
    } catch (error) {
      console.error('Error geocoding address:', error)
      onChange(suggestion)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pl-10 ${className} ${error ? 'border-red-500' : ''}`}
        />
        <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 