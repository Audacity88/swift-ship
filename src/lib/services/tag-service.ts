import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { Tag, TagSuggestion } from '@/types/tag'

export const tagService = {
  async getSuggestions(context: ServerContext, ticketId: string): Promise<TagSuggestion[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      // Get ticket tags first
      const { data: ticketTags, error: ticketError } = await supabase
        .from('ticket_tags')
        .select('tag_id')
        .eq('ticket_id', ticketId)

      if (ticketError) {
        console.error('Failed to get ticket tags:', ticketError)
        throw ticketError
      }

      // Get most used tags excluding ones already on the ticket
      const existingTagIds = (ticketTags || []).map(t => t.tag_id)
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          color,
          usage_count,
          created_at
        `)
        .not('id', 'in', `(${existingTagIds.join(',')})`)
        .order('usage_count', { ascending: false })
        .limit(10)

      if (tagsError) {
        console.error('Failed to get tag suggestions:', tagsError)
        throw tagsError
      }

      return (tags || []).map((tag: any) => ({
        tag: {
          id: tag.id,
          name: tag.name,
          color: tag.color || '#666666',
          slug: tag.name.toLowerCase().replace(/\s+/g, '-'),
          created_at: tag.created_at,
        },
        score: tag.usage_count || 0,
        reason: 'frequently_used',
      }))
    } catch (error) {
      console.error('Error in getSuggestions:', error)
      throw error
    }
  },

  async searchTags(context: ServerContext, query: string): Promise<Tag[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      if (!query.trim()) return []

      const { data, error } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          color,
          usage_count,
          created_at,
          created_by
        `)
        .ilike('name', `%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Failed to search tags:', error)
        throw error
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color || '#666666',
        slug: t.name.toLowerCase().replace(/\s+/g, '-'),
        usage_count: t.usage_count || 0,
        created_at: t.created_at,
        created_by: t.created_by,
      }))
    } catch (error) {
      console.error('Error in searchTags:', error)
      throw error
    }
  },

  async createTag(context: ServerContext, name: string, color?: string): Promise<Tag> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data: tag, error } = await supabase
        .from('tags')
        .insert({
          name,
          color: color || '#666666',
          created_by: session.user.id,
          created_at: new Date().toISOString(),
          usage_count: 0
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create tag:', error)
        throw error
      }

      return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        slug: tag.name.toLowerCase().replace(/\s+/g, '-'),
        usage_count: 0,
        created_at: tag.created_at,
        created_by: tag.created_by,
      }
    } catch (error) {
      console.error('Error in createTag:', error)
      throw error
    }
  },

  async updateTagUsage(context: ServerContext, tagId: string, increment: boolean = true): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase.rpc('update_tag_usage_count', {
        p_tag_id: tagId,
        p_increment: increment
      })

      if (error) {
        console.error('Failed to update tag usage:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updateTagUsage:', error)
      throw error
    }
  }
}