'use client'

import { useState, useEffect } from 'react'
import {
  Save,
  Loader2,
  AlertCircle,
  Trash,
  Share2,
  Clock,
  Search,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { SavedSearch, SearchGroup } from '@/types/search'
import type { ChangeEvent } from 'react'

interface SavedSearchesProps {
  currentUserId: string
  currentQuery: SearchGroup
  onLoadSearch: (search: SavedSearch) => void
  className?: string
}

export function SavedSearches({
  currentUserId,
  currentQuery,
  onLoadSearch,
  className = ''
}: SavedSearchesProps) {
  // State
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    isShared: false
  })

  // Load saved searches
  useEffect(() => {
    const loadSavedSearches = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/saved-searches').then(res => res.json())
        setSavedSearches(response.data)
      } catch (error) {
        console.error('Failed to load saved searches:', error)
        setError('Failed to load saved searches')
      } finally {
        setIsLoading(false)
      }
    }

    loadSavedSearches()
  }, [])

  // Save current search
  const handleSaveSearch = async () => {
    if (!saveForm.name.trim()) {
      setError('Name is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: saveForm.name.trim(),
          description: saveForm.description.trim() || undefined,
          query: currentQuery,
          is_shared: saveForm.isShared
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save search')
      }

      // Refresh saved searches
      const { data } = await fetch('/api/saved-searches').then(res => res.json())
      setSavedSearches(data)

      // Reset form and close dialog
      setSaveForm({
        name: '',
        description: '',
        isShared: false
      })
      setIsSaveDialogOpen(false)
    } catch (error) {
      console.error('Failed to save search:', error)
      setError(error instanceof Error ? error.message : 'Failed to save search')
    } finally {
      setIsLoading(false)
    }
  }

  // Delete saved search
  const handleDeleteSearch = async (searchId: string) => {
    if (!confirm('Are you sure you want to delete this saved search?')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/saved-searches/${searchId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete search')
      }

      // Remove from list
      setSavedSearches(prev => prev.filter(s => s.id !== searchId))
    } catch (error) {
      console.error('Failed to delete search:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete search')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Saved Searches</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSaveDialogOpen(true)}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Current
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Saved Searches List */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {savedSearches.map(search => (
            <div
              key={search.id}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{search.name}</span>
                  {search.is_shared && (
                    <Badge variant="secondary">
                      <Share2 className="w-3 h-3 mr-1" />
                      Shared
                    </Badge>
                  )}
                </div>
                {search.description && (
                  <div className="text-sm text-gray-500">
                    {search.description}
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {search.created_by_id === currentUserId ? 'You' : search.created_by_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(search.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLoadSearch(search)}
                >
                  <Search className="w-4 h-4" />
                </Button>
                {search.created_by_id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSearch(search.id)}
                    disabled={isLoading}
                  >
                    <Trash className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save your current search for quick access later
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={saveForm.name}
                onChange={e => setSaveForm(prev => ({
                  ...prev,
                  name: (e as ChangeEvent<HTMLInputElement>).target.value
                }))}
                placeholder="Enter a name for this search..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Input
                id="description"
                value={saveForm.description}
                onChange={e => setSaveForm(prev => ({
                  ...prev,
                  description: (e as ChangeEvent<HTMLInputElement>).target.value
                }))}
                placeholder="Add a description..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="shared" className="text-sm font-medium">
                Visibility
              </label>
              <Select
                value={saveForm.isShared ? 'shared' : 'private'}
                onValueChange={(value: string) => setSaveForm(prev => ({
                  ...prev,
                  isShared: value === 'shared'
                }))}
              >
                <SelectTrigger id="shared">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared with Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSearch}
              disabled={isLoading}
            >
              {isLoading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 