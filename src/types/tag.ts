export interface Tag {
  id: string
  name: string
  slug: string // URL-friendly version of name
  color: string
  description?: string
  parentId?: string // For hierarchical structure
  metadata?: {
    icon?: string
    sortOrder?: number
    isSystem?: boolean // For system-generated tags that cannot be deleted
  }
}

export interface TagWithChildren extends Tag {
  children: TagWithChildren[]
}

export interface TagStats {
  id: string
  count: number
  lastUsed: string
}

export type TagSuggestion = {
  tag: Tag
  score: number // Relevance score for suggestions
  reason: 'frequent' | 'recent' | 'similar' | 'cooccurrence'
}

export interface TagCategory {
  id: string
  name: string
  description?: string
  isRequired?: boolean
  maxTags?: number
  allowedTags: string[] // Tag IDs that can be used in this category
}

// Helper type for bulk operations
export interface TagOperation {
  type: 'add' | 'remove' | 'update'
  tagIds: string[]
  targetIds: string[] // IDs of tickets to apply the operation to
}

// Helper functions
export const createTagSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const getTagAncestors = async (
  tag: Tag,
  allTags: Tag[]
): Promise<Tag[]> => {
  const ancestors: Tag[] = []
  let currentTag = tag

  while (currentTag.parentId) {
    const parent = allTags.find(t => t.id === currentTag.parentId)
    if (!parent) break
    ancestors.unshift(parent)
    currentTag = parent
  }

  return ancestors
}

export const buildTagHierarchy = (tags: Tag[]): TagWithChildren[] => {
  const tagMap = new Map<string, TagWithChildren>()
  const rootTags: TagWithChildren[] = []

  // First pass: create TagWithChildren objects
  tags.forEach(tag => {
    tagMap.set(tag.id, { ...tag, children: [] })
  })

  // Second pass: build hierarchy
  tags.forEach(tag => {
    const tagWithChildren = tagMap.get(tag.id)!
    if (tag.parentId) {
      const parent = tagMap.get(tag.parentId)
      if (parent) {
        parent.children.push(tagWithChildren)
      }
    } else {
      rootTags.push(tagWithChildren)
    }
  })

  return rootTags
} 