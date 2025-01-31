import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Message {
  id: string
  ticket_id: string
  content: string
  author_type: 'agent' | 'customer' | 'system'
  author_id: string
  created_at: string
  author?: {
    id: string
    email: string
    name: string | null
    avatar_url: string | null
  }
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

    // First get messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    // Group messages by author type
    const customerMessages = messages.filter(m => m.author_type === 'customer')
    const agentMessages = messages.filter(m => m.author_type === 'agent')

    // Get customer authors
    const customerIds = [...new Set(customerMessages.map(m => m.author_id))]
    const { data: customers, error: customersError } = customerIds.length > 0 ? await supabase
      .from('customers')
      .select('id, name, email, avatar')
      .in('id', customerIds) : { data: [], error: null }

    if (customersError) throw customersError

    // Get agent authors
    const agentIds = [...new Set(agentMessages.map(m => m.author_id))]
    const { data: agents, error: agentsError } = agentIds.length > 0 ? await supabase
      .from('agents')
      .select('id, name, email, avatar')
      .in('id', agentIds) : { data: [], error: null }

    if (agentsError) throw agentsError

    // Map authors to messages
    const messagesWithAuthors = messages.map(message => {
      const author = message.author_type === 'customer' 
        ? customers?.find(c => c.id === message.author_id)
        : agents?.find(a => a.id === message.author_id)

      return {
        ...message,
        author: author ? {
          id: author.id,
          email: author.email,
          name: author.name,
          avatar_url: author.avatar
        } : undefined
      }
    })

    return messagesWithAuthors as Message[]
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