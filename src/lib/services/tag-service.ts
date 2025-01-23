import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { Tag, TagSuggestion } from '@/types/tag'

export const tagService = {
  async getSuggestions(context: ServerContext, ticketId: string): Promise<TagSuggestion[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data: tag, error } = await supabase
        .from('tags')
        .insert({
          name,
          color: color || '#666666',
          created_by: user.id,
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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
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
  },

  async updateTag(context: ServerContext, id: string, name: string, color?: string): Promise<Tag> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('tags')
        .update({ name, color, updated_by: user.id })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update tag:', error)
        throw error
      }

      return {
        id: data.id,
        name: data.name,
        color: data.color || '#666666',
        slug: data.name.toLowerCase().replace(/\s+/g, '-'),
        usage_count: data.usage_count || 0,
        created_at: data.created_at,
        created_by: data.created_by,
      }
    } catch (error) {
      console.error('Error in updateTag:', error)
      throw error
    }
  },

  async deleteTag(context: ServerContext, id: string): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      // Check for child tags
      const { data: children } = await supabase
        .from('tags')
        .select('id')
        .eq('parent_id', id)
        .limit(1)

      if (children?.length) {
        throw new Error('Cannot delete tag with child tags')
      }

      // Check for tag usage
      const { data: usage } = await supabase
        .from('ticket_tags')
        .select('ticket_id')
        .eq('tag_id', id)
        .limit(1)

      if (usage?.length) {
        throw new Error('Cannot delete tag that is in use')
      }

      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Failed to delete tag:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteTag:', error)
      throw error
    }
  },

  async bulkUpdateTicketTags(
    context: ServerContext,
    operation: 'add' | 'remove',
    tagIds: string[],
    ticketIds: string[]
  ): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Unauthorized')
      }

      if (operation === 'add') {
        // Create tag-ticket associations
        const associations = ticketIds.flatMap(ticketId =>
          tagIds.map(tagId => ({
            ticket_id: ticketId,
            tag_id: tagId,
            created_by: user.id,
            created_at: new Date().toISOString()
          }))
        )

        const { error } = await supabase
          .from('ticket_tags')
          .upsert(associations)

        if (error) {
          console.error('Failed to add tags to tickets:', error)
          throw error
        }

        // Update usage count for each tag
        await Promise.all(tagIds.map(tagId => this.updateTagUsage(context, tagId, true)))
      } else {
        // Remove tag-ticket associations
        const { error } = await supabase
          .from('ticket_tags')
          .delete()
          .in('ticket_id', ticketIds)
          .in('tag_id', tagIds)

        if (error) {
          console.error('Failed to remove tags from tickets:', error)
          throw error
        }

        // Update usage count for each tag
        await Promise.all(tagIds.map(tagId => this.updateTagUsage(context, tagId, false)))
      }
    } catch (error) {
      console.error('Error in bulkUpdateTicketTags:', error)
      throw error
    }
  }
}