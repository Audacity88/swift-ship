'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Tag } from '@/types/ticket'

interface TagListProps {
  tags: Tag[]
  limit?: number
  className?: string
  onTagClick?: (tag: Tag) => void
}

export function TagList({
  tags,
  limit = 3,
  className = '',
  onTagClick
}: TagListProps) {
  const [isOpen, setIsOpen] = useState(false)
  const displayTags = tags.slice(0, limit)
  const remainingCount = tags.length - limit

  const handleTagClick = (tag: Tag, e: React.MouseEvent) => {
    e.stopPropagation()
    onTagClick?.(tag)
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {displayTags.map(tag => (
        <Badge
          key={tag.id}
          className="cursor-pointer"
          style={{ backgroundColor: tag.color }}
          onClick={e => handleTagClick(tag, e)}
        >
          {tag.name}
        </Badge>
      ))}
      
      {remainingCount > 0 && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Badge
              variant="outline"
              className="cursor-pointer"
              onClick={e => e.stopPropagation()}
            >
              +{remainingCount} more
            </Badge>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-wrap gap-1 max-w-xs">
              {tags.slice(limit).map(tag => (
                <Badge
                  key={tag.id}
                  className="cursor-pointer"
                  style={{ backgroundColor: tag.color }}
                  onClick={e => handleTagClick(tag, e)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
} 