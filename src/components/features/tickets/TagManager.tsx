'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Tag as TagIcon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Tag, TagSuggestion } from '@/types/tag'
import { tagService } from '@/lib/services'

interface TagManagerProps {
  ticketId: string
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  className?: string
  readOnly?: boolean
}

export function TagManager({
  ticketId,
  selectedTags,
  onTagsChange,
  className = '',
  readOnly = false
}: TagManagerProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [searchResults, setSearchResults] = useState<Tag[]>([])

  // Load tag suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const tagSuggestions = await tagService.getSuggestions(ticketId)
        setSuggestions(tagSuggestions)
      } catch (error) {
        console.error('Failed to load tag suggestions:', error)
      }
    }

    loadSuggestions()
  }, [ticketId])

  // Handle search
  useEffect(() => {
    const searchTags = async () => {
      if (!searchValue.trim()) {
        setSearchResults([])
        return
      }

      setIsLoading(true)
      try {
        const results = await tagService.searchTags(searchValue)
        setSearchResults(results)
      } catch (error) {
        console.error('Failed to search tags:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(searchTags, 300)
    return () => clearTimeout(debounce)
  }, [searchValue])

  const handleSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      onTagsChange([...selectedTags, tag])
    }
    setOpen(false)
  }

  const handleRemove = (tagId: string) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId))
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {selectedTags.map(tag => (
          <div
            key={tag.id}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-sm
              ${tag.color || 'bg-gray-100 text-gray-800'}
            `}
          >
            <span>{tag.name}</span>
            {!readOnly && (
              <button
                onClick={() => handleRemove(tag.id)}
                className="p-0.5 hover:bg-black/10 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {!readOnly && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1"
                aria-expanded={open}
              >
                <Plus className="w-4 h-4" />
                Add Tag
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search tags..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandEmpty>
                  {isLoading ? 'Searching...' : 'No tags found.'}
                </CommandEmpty>
                <ScrollArea className="h-[300px]">
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <CommandGroup heading="Search Results">
                      {searchResults.map(tag => (
                        <CommandItem
                          key={tag.id}
                          value={tag.id}
                          onSelect={() => handleSelect(tag)}
                        >
                          <div className={`w-3 h-3 rounded-full mr-2 ${tag.color}`} />
                          <span>{tag.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Suggestions */}
                  {suggestions.length > 0 && !searchValue && (
                    <CommandGroup heading="Suggested Tags">
                      {suggestions.map(({ tag, score, reason }) => (
                        <CommandItem
                          key={tag.id}
                          value={tag.id}
                          onSelect={() => handleSelect(tag)}
                        >
                          <div className={`w-3 h-3 rounded-full mr-2 ${tag.color}`} />
                          <span>{tag.name}</span>
                          <span className="ml-auto text-xs text-gray-500">
                            {reason}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </ScrollArea>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
} 