'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Search, Plus, X, Check } from 'lucide-react'
import type { Tag } from '@/types/ticket'

// Mock data - replace with actual API calls
// Remove the mock definitions entirely
let tagCategories: Array<any> = []

interface TagWithCategory extends Tag {
  category?: string
}

export default function TicketTagsPage() {
  const params = useParams()
  const ticketId = params?.id as string
  const [searchQuery, setSearchQuery] = useState('')
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [showNewTagForm, setShowNewTagForm] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', color: '#000000' })

  // Filter tags based on search query
  useEffect(() => {
  const loadTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (!response.ok) throw new Error('Failed to fetch tags')
      const data = await response.json()
      setTags(data)
    } catch (err) {
      console.error('Failed to load tags:', err)
    }
  }
  loadTags()
}, [])

const filteredTags = tags.filter(tag => {
  if (!searchQuery) return true
  return tag.name.toLowerCase().includes(searchQuery.toLowerCase())
})

  const isSelected = (tagId: string) => {
    return selectedTags.some(tag => tag.id === tagId)
  }

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev =>
      isSelected(tag.id)
        ? prev.filter(t => t.id !== tag.id)
        : [...prev, tag]
    )
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTag.name.trim()) return

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Reset form
    setNewTag({ name: '', color: '#000000' })
    setShowNewTagForm(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tag Management */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Tags</h2>
            <button
              onClick={() => setShowNewTagForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white \
                bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              style={{ backgroundColor: '#0052CC' }}
            >
              <Plus className="w-4 h-4" />
              Create Tag
            </button>
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

          {/* Tag Categories */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">All Tags</h3>
              <div className="flex flex-wrap gap-2">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                                font-medium transition-colors ${
                      isSelected(tag.id)
                        ? 'text-white'
                        : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}
                    style={isSelected(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    {tag.name}
                    {isSelected(tag.id) && <X className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* New Tag Form */}
        {showNewTagForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Create New Tag</h3>
              <button
                onClick={() => setShowNewTagForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTag} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={newTag.name}
                  onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter tag name..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm \
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Color
                </label>
                <input
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 p-1 rounded-lg border border-gray-200"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white \
                    bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                  style={{ backgroundColor: '#0052CC' }}
                >
                  <Check className="w-4 h-4" />
                  Create Tag
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Selected Tags */}
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Selected Tags</h2>
          {selectedTags.length > 0 ? (
            <div className="space-y-3">
              {selectedTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 rounded-lg \
                    border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                  </div>
                  <button
                    onClick={() => toggleTag(tag)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No tags selected</p>
          )}
        </div>
      </div>
    </div>
  )
} 