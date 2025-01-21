'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Tag } from '@/types/ticket'

interface TagSelectProps {
  value: string[]
  onChange: (value: string[]) => void
}

export const TagSelect = ({
  value,
  onChange
}: TagSelectProps) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: tags, isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags')
      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }
      return response.json()
    }
  })

  const selectedTags = tags?.filter((tag: Tag) => value.includes(tag.id)) || []

  const handleSelect = (tagId: string) => {
    const isSelected = value.includes(tagId)
    if (isSelected) {
      onChange(value.filter(id => id !== tagId))
    } else {
      onChange([...value, tagId])
    }
  }

  const handleRemove = (tagId: string) => {
    onChange(value.filter(id => id !== tagId))
  }

  const createTag = async (name: string) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create tag')
      }

      const newTag = await response.json()
      onChange([...value, newTag.id])
      setSearch('')
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => handleRemove(tag.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            Select tags...
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandEmpty>
              <button
                className="p-2 text-sm text-blue-500 hover:underline"
                onClick={() => createTag(search)}
              >
                Create tag "{search}"
              </button>
            </CommandEmpty>
            <CommandGroup>
              {tags?.map((tag: Tag) => (
                <CommandItem
                  key={tag.id}
                  value={tag.id}
                  onSelect={handleSelect}
                >
                  <Badge
                    variant="secondary"
                    className="mr-2"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
} 