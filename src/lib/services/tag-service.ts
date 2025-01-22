import { supabase } from '@/lib/supabase'
import type { Tag, TagSuggestion } from '@/types/tag'

export const tagService = {
  async getSuggestions(ticketId: string): Promise<TagSuggestion[]> {
    // In TagManager, we do getSuggestions. We'll just do a simple approach:
    // Return top used tags or random tags from 'tags' table. You could add real logic if desired.
    try {
      const { data: tags, error } = await supabase
        .from('tags')
        .select('*')
        .limit(10)

      if (error || !tags) {
        console.error('Failed to get tag suggestions:', error)
        return []
      }

      // Fake relevance
      return tags.map((tag: any) => ({
        tag: {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          slug: '',
        },
        score: Math.random(),
        reason: 'frequent',
      }))
    } catch (error) {
      console.error('Failed to get tag suggestions:', error)
      return []
    }
  },

  async searchTags(query: string): Promise<Tag[]> {
    if (!query.trim()) return []
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(20)

      if (error) {
        console.error('Failed to search tags:', error)
        return []
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        slug: t.slug || '',
      }))
    } catch (error) {
      console.error('searchTags error:', error)
      return []
    }
  },
}