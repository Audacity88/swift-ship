'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Search, Tag, Plus, X } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

interface Tag {
  id: string
  name: string
  color: string
}

export default function TicketTagsPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const params = useParams()
  const ticketId = params?.id as string

  // Load current ticket tags
  useEffect(() => {
    const loadTicketTags = async () => {
      if (!user) return
      try {
        const response = await fetch('/api/tickets/' + ticketId, {
          credentials: 'include'
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch ticket tags')
        }
        const data = await response.json()
        setSelectedTags((data.ticket?.metadata?.tags || []))
      } catch (error) {
        console.error('Failed to load ticket tags:', error)
      }
    }
    loadTicketTags()
  }, [ticketId, user])

  // Load available tags
  useEffect(() => {
    const loadTags = async () => {
      if (!user) return
      try {
        const response = await fetch('/api/tags', {
          credentials: 'include'
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to fetch tags')
        }
        const data = await response.json()
        setAvailableTags(data)
      } catch (error) {
        console.error('Failed to load tags:', error)
      }
    }
    loadTags()
  }, [user])

  // Filter tags based on search query
  const filteredTags = availableTags.filter((tag) => {
    if (!searchQuery) return true
    return tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleTagToggle = async (tag: Tag) => {
    if (!user) return
    setIsLoading(true)
    try {
      const isSelected = selectedTags.some(t => t.id === tag.id)
      const newTags = isSelected
        ? selectedTags.filter(t => t.id !== tag.id)
        : [...selectedTags, tag]

      const response = await fetch('/api/tickets/' + ticketId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags.map(t => t.id) }),
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update tags')
      }

      setSelectedTags(newTags)
      router.refresh()
    } catch (error) {
      console.error('Failed to update tags:', error)
      // TODO: Add toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Ticket Tags</h2>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags..."
            className="w-full pl-10 pr-4 py-2 text-base border border-gray-200 rounded-lg \
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Selected Tags */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Tags</h3>
          <div className="flex flex-wrap gap-2">
            {selectedTags.length === 0 ? (
              <p className="text-sm text-gray-500">No tags selected</p>
            ) : (
              selectedTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => !isLoading && handleTagToggle(tag)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium \
                    rounded-full transition-colors"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    borderColor: `${tag.color}40`,
                  }}
                >
                  <Tag className="w-3 h-3" />
                  {tag.name}
                  <X className="w-3 h-3" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Available Tags */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Available Tags</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.some(t => t.id === tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => !isLoading && handleTagToggle(tag)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium \
                    rounded-lg border transition-colors ${
                    isSelected
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-gray-300'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          borderColor: `${tag.color}40`,
                        }
                      : {}
                  }
                >
                  {isSelected ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {tag.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
} 