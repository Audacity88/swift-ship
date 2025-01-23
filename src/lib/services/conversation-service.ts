import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Message {
  id: string
  ticket_id: string
  content: string
  author_type: 'agent' | 'customer' | 'system'
  author_id: string
  created_at: string
  attachments?: {
    name: string
    url: string
    type: string
    size: number
  }[]
}

export interface Ticket {
  id: string
  title: string
  status: string
  created_at: string
  customer: {
    id: string
    name: string
    email: string
  }
  messages: Message[]
}

export const conversationService = {
  async getTicketsWithMessages(
    context: ServerContext,
    userId: string
  ): Promise<Ticket[]> {
    const supabase = getServerSupabase(context)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await supabase
      .from('tickets')
      .select(`
        id,
        title,
        status,
        created_at,
        customer:customer_id (
          id,
          name,
          email
        ),
        messages!inner (
          id,
          content,
          created_at,
          author_id,
          author_type
        )
      `)
      .or(`customer_id.eq.${userId},assignee_id.eq.${userId}`)
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(1, { foreignTable: 'messages' })

    if (error) throw error
    return data as Ticket[]
  },

  async getMessages(
    context: ServerContext,
    ticketId: string
  ): Promise<Message[]> {
    const supabase = getServerSupabase(context)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as Message[]
  },

  async addMessage(
    context: ServerContext,
    ticketId: string,
    content: string,
    authorType: 'agent' | 'customer' | 'system',
    attachments?: {
      name: string
      url: string
      type: string
      size: number
    }[]
  ): Promise<Message> {
    const supabase = getServerSupabase(context)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
        content,
        author_type: authorType,
        author_id: user.id,
        attachments
      })
      .select()
      .single()

    if (error) throw error
    return data as Message
  },

  async subscribeToMessages(
    context: ServerContext,
    ticketId: string,
    callback: (message: Message) => void
  ): Promise<() => void> {
    const supabase = getServerSupabase(context)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const channel = supabase
      .channel(`messages:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          callback(payload.new as Message)
        }
      )
      .subscribe()

    // Return a function that properly unsubscribes and removes the channel
    return () => {
      void channel.unsubscribe()
      void supabase.removeChannel(channel)
    }
  }
} 