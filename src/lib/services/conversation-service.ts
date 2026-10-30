import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

export interface Attachment {
  name: string
  path: string
  type: string
  size: number
}

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
export const MAX_ATTACHMENTS = 5
const ATTACHMENT_BUCKET = 'ticket-attachments'

// Keep these extension/MIME pairs in sync with migration 35. Unknown or empty
// browser MIME types are rejected rather than guessed from a filename.
export const ATTACHMENT_TYPES: Record<string, string[]> = {
  png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'],
  gif: ['image/gif'], webp: ['image/webp'], heic: ['image/heic'],
  pdf: ['application/pdf'], txt: ['text/plain'], csv: ['text/csv'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  odt: ['application/vnd.oasis.opendocument.text'],
  ods: ['application/vnd.oasis.opendocument.spreadsheet'],
  zip: ['application/zip', 'application/x-zip-compressed'],
}
export const ATTACHMENT_ACCEPT = Object.entries(ATTACHMENT_TYPES)
  .flatMap(([extension, types]) => [`.${extension}`, ...types]).join(',')
export const UPLOAD_FAILURE_MESSAGE = 'Upload failed. Please check your connection and try again.'
export const ATTACHMENT_TYPE_MESSAGE = 'Unsupported attachment type. Choose PNG, JPEG, GIF, WebP, HEIC, PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, PPT/PPTX, ODT/ODS, or ZIP with a matching file type.'

export function validateAttachments(files: File[]) {
  if (files.some(file => {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    return /[\/\\\x00-\x1f\x7f]/.test(file.name) || !file.name.includes('.')
      || !Object.prototype.hasOwnProperty.call(ATTACHMENT_TYPES, extension)
      || !ATTACHMENT_TYPES[extension].includes(file.type.toLowerCase())
  })) throw new Error(ATTACHMENT_TYPE_MESSAGE)
  if (files.length > MAX_ATTACHMENTS) throw new Error('Attach at most 5 files per reply.')
  if (files.some(file => file.size === 0 || file.size > MAX_ATTACHMENT_SIZE)) {
    throw new Error('Each attachment must be nonempty and no larger than 10 MB.')
  }
}

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
  attachments?: Attachment[]
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
        messages (
          id,
          content,
          created_at,
          author_id,
          ticket_id,
          author_type
        )
      `)
      .or(`customer_id.eq.${userId},assignee_id.eq.${userId}`)
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(1, { foreignTable: 'messages' })
      // Without generated DB relationships the SDK assumes customer is an array.
      .returns<Ticket[]>()

    if (error) throw error
    return data || []
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

    const { data: ticket, error: ticketError } = await supabase.from('tickets')
      .select('id, description, customer_id, created_at').eq('id', ticketId).maybeSingle()
    if (ticketError) throw ticketError
    if (!ticket) throw new Error('Ticket not found or access denied')

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
    const customerIds = [...new Set([ticket.customer_id, ...customerMessages.map(m => m.author_id)])]
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

    const customer = customers?.find(c => c.id === ticket.customer_id)
    const original: Message[] = ticket.description ? [{
      id: `description:${ticket.id}`, ticket_id: ticket.id,
      content: ticket.description, author_id: ticket.customer_id,
      author_type: 'customer', created_at: ticket.created_at,
      author: customer ? { ...customer, avatar_url: customer.avatar } : undefined
    }] : []
    return [...original, ...messagesWithAuthors] as Message[]
  },

  async addMessage(
    context: ServerContext,
    ticketId: string,
    content: string,
    authorType: 'agent' | 'customer' | 'system',
    attachments?: Attachment[],
    isInternal = false
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
        attachments: attachments || [],
        is_internal: isInternal
      })
      .select()
      .single()

    if (error) throw error
    return data as Message
  },

  async uploadAttachments(context: ServerContext, ticketId: string, files: File[], isInternal = false): Promise<Attachment[]> {
    validateAttachments(files)
    const supabase = getServerSupabase(context)
    const uploaded: Attachment[] = []
    try {
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'attachment'
        const path = `${ticketId}/${isInternal ? 'internal' : 'public'}/${crypto.randomUUID()}/${safeName}`
        const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, {
          contentType: file.type.toLowerCase(), upsert: false
        })
        if (error) throw error
        uploaded.push({ name: file.name, path, type: file.type.toLowerCase(), size: file.size })
      }
      return uploaded
    } catch (error) {
      console.error('Attachment upload failed:', error)
      try { await this.removeAttachments(context, uploaded) }
      catch (cleanupError) { console.error('Attachment cleanup failed:', cleanupError) }
      throw new Error(UPLOAD_FAILURE_MESSAGE)
    }
  },

  async removeAttachments(context: ServerContext, attachments: Attachment[]) {
    if (attachments.length) {
      const supabase = getServerSupabase(context)
      const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).remove(attachments.map(file => file.path))
      if (error) throw error
    }
  },

  async getAttachmentUrl(context: ServerContext, attachment: Attachment): Promise<string> {
    const supabase = getServerSupabase(context)
    const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET)
      .createSignedUrl(attachment.path, 60, { download: attachment.name })
    if (error || !data?.signedUrl) throw new Error('Unable to download this attachment. Please retry.')
    // storage-js 2.7 uses encodeURI on the complete URL, leaving filename '&'
    // and '#' as query/fragment syntax. Rebuild that suffix as one encoded value.
    const url = new URL(data.signedUrl.split('&download=', 1)[0])
    url.searchParams.set('download', attachment.name)
    return url.href
  },

  async subscribeToMessages(context: ServerContext, ticketId: string, callback: (message: Message) => void): Promise<() => void> {
    return subscribeToTicketChanges(context, ticketId, 'messages', 'INSERT', 'ticket_id', row => callback(row as unknown as Message))
  },

  async subscribeToTicket(context: ServerContext, ticketId: string, callback: (ticket: Record<string, unknown>) => void): Promise<() => void> {
    return subscribeToTicketChanges(context, ticketId, 'tickets', 'UPDATE', 'id', callback)
  }
}

async function subscribeToTicketChanges(
  context: ServerContext, ticketId: string, table: 'messages' | 'tickets',
  event: 'INSERT' | 'UPDATE', filterColumn: 'ticket_id' | 'id',
  callback: (row: Record<string, unknown>) => void
): Promise<() => void> {
  const supabase = getServerSupabase(context)
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) throw new Error('Please sign in to receive live ticket updates.')
  // Set the JWT before joining so Realtime can evaluate the caller's RLS policies.
  await supabase.realtime.setAuth(session.access_token)
  const channel = supabase.channel(`${table}:${ticketId}:${crypto.randomUUID()}`)
  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    void supabase.removeChannel(channel)
  }
  try {
    await new Promise<void>((resolve, reject) => {
      let joined = false
      let postgresReady = false
      const timeout = setTimeout(() => reject(new Error('Live updates could not connect. Please reopen this ticket.')), 20000)
      const ready = () => { if (joined && postgresReady) { clearTimeout(timeout); resolve() } }
      channel.on('system', {}, payload => {
        if (payload.extension !== 'postgres_changes') return
        if (payload.status === 'ok') { postgresReady = true; ready() }
        else if (payload.status === 'error') {
          clearTimeout(timeout)
          reject(new Error('Live updates could not connect. Please reopen this ticket.'))
        }
      })
      const filter = { schema: 'public', table, filter: `${filterColumn}=eq.${ticketId}` }
      if (event === 'INSERT') {
        channel.on('postgres_changes', { ...filter, event: 'INSERT' }, payload => { if (!stopped) callback(payload.new) })
      } else {
        channel.on('postgres_changes', { ...filter, event: 'UPDATE' }, payload => { if (!stopped) callback(payload.new) })
      }
      channel.subscribe(status => {
          if (status === 'SUBSCRIBED') { joined = true; ready() }
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearTimeout(timeout)
            reject(new Error('Live updates could not connect. Please reopen this ticket.'))
          }
        })
    })
    return stop
  } catch (error) {
    stop()
    throw error
  }
}
