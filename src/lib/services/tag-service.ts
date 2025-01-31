import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { Tag, TagSuggestion } from '@/types/tag'

interface TicketTag {
  ticket_id: string
  tag_id: string
}

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
          created_at
        `)
        .not('id', 'in', `(${existingTagIds.join(',')})`)
        .order('created_at', { ascending: false })
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
        score: 0,
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
          created_at,
          created_by
        `)
        .ilike('name', `%${query}%`)
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
      console.log('[Tag Service] Creating new tag:', name)
      const supabase = getServerSupabase(context)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('[Tag Service] Unauthorized access')
        throw new Error('Unauthorized')
      }

      const { data: tag, error } = await supabase
        .from('tags')
        .insert({
          name,
          color: color || '#666666',
          created_by: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('[Tag Service] Failed to create tag:', error)
        throw error
      }

      console.log('[Tag Service] Successfully created tag:', tag)
      return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        slug: tag.name.toLowerCase().replace(/\s+/g, '-'),
        created_at: tag.created_at,
        created_by: tag.created_by,
      }
    } catch (error) {
      console.error('[Tag Service] Error in createTag:', error)
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
      const { supabase, user } = context
      if (!supabase || !user) {
        throw new Error('Unauthorized')
      }

      if (operation === 'add') {
        // Create tag-ticket associations
        const associations = ticketIds.flatMap(ticketId =>
          tagIds.map(tagId => ({
            ticket_id: ticketId,
            tag_id: tagId
          }))
        )

        // First verify the tags exist
        const { data: existingTags, error: tagCheckError } = await supabase
          .from('tags')
          .select('*')
          .in('id', tagIds)

        if (tagCheckError) {
          console.error('Error checking tags:', tagCheckError)
          throw tagCheckError
        }

        if (!existingTags || existingTags.length !== tagIds.length) {
          throw new Error('Some tags do not exist')
        }

        // Insert the associations
        const { error } = await supabase
          .from('ticket_tags')
          .insert(associations)

        if (error) {
          // If it's a duplicate, that's fine - ignore the error
          if (error.code === '23505') { // PostgreSQL unique violation code
            return
          }
          console.error('Failed to add tags to tickets:', error)
          throw error
        }
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
      }
    } catch (error) {
      console.error('Error in bulkUpdateTicketTags:', error)
      throw error
    }
  },

  async addTagToTicket(context: ServerContext, tagId: string, ticketId: string): Promise<void> {
    try {
      console.log('[Tag Service] Adding tag to ticket:', { tagId, ticketId })
      const { supabase, user } = context
      if (!supabase || !user) {
        console.error('[Tag Service] Unauthorized access')
        throw new Error('Unauthorized')
      }

      // Check if user is an agent or admin
      const { data: agent } = await supabase
        .from('agents')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!agent) {
        console.error('[Tag Service] Unauthorized - Agent access required')
        throw new Error('Unauthorized - Agent access required')
      }

      // First get the tag details
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .single()

      if (tagError) {
        console.error('Failed to fetch tag:', tagError)
        throw tagError
      }

      // Add the tag to the ticket_tags junction table
      const { error: insertError } = await supabase
        .from('ticket_tags')
        .insert({
          ticket_id: ticketId,
          tag_id: tagId
        })

      if (insertError) {
        // If it's a duplicate, that's fine - ignore the error
        if (insertError.code === '23505') { // PostgreSQL unique violation code
          return
        }
        console.error('[Tag Service] Failed to add tag to ticket:', insertError)
        throw insertError
      }

      console.log('[Tag Service] Successfully added tag to ticket')
    } catch (error) {
      console.error('[Tag Service] Error in addTagToTicket:', error)
      throw error
    }
  },

  async removeTagFromTicket(context: ServerContext, tagId: string, ticketId: string): Promise<void> {
    try {
      console.log('[Tag Service] Removing tag from ticket:', { tagId, ticketId })
      const { supabase, user } = context
      if (!supabase || !user) {
        console.error('[Tag Service] Unauthorized access')
        throw new Error('Unauthorized')
      }

      // Check if user is an agent or admin
      const { data: agent } = await supabase
        .from('agents')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!agent) {
        console.error('[Tag Service] Unauthorized - Agent access required')
        throw new Error('Unauthorized - Agent access required')
      }

      // Remove the tag from the ticket_tags junction table
      const { error: deleteError } = await supabase
        .from('ticket_tags')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('tag_id', tagId)

      if (deleteError) {
        console.error('[Tag Service] Failed to remove tag from ticket:', deleteError)
        throw deleteError
      }

      console.log('[Tag Service] Successfully removed tag from ticket')
    } catch (error) {
      console.error('[Tag Service] Error in removeTagFromTicket:', error)
      throw error
    }
  }
}