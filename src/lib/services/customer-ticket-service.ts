import { db } from '@/lib/db';
import type { Ticket, TicketStatus, TicketComment } from '@/types/ticket';
import type { Session } from '@supabase/supabase-js';

interface CreateTicketData {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface TicketListParams {
  status?: TicketStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

interface TicketListResponse {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const customerTicketService = {
  async createTicket(data: CreateTicketData): Promise<Ticket> {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user?.id) throw new Error('Not authenticated');

    const { data: ticket, error } = await db.from('tickets').insert({
      title: data.title,
      description: data.description,
      status: 'open',
      priority: data.priority || 'medium',
      customer_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single();

    if (error) throw error;
    return ticket;
  },

  async getTickets(params: TicketListParams = {}): Promise<TicketListResponse> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user?.id) throw new Error('Not authenticated');

    let query = db
      .from('tickets')
      .select('*, comments(*)')
      .eq('customer_id', session.user.id);

    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: tickets, error, count } = await query;
    if (error) throw error;

    // Get total count
    const { count: totalCount, error: countError } = await db
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', session.user.id);

    if (countError) throw countError;

    return {
      tickets: tickets || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    };
  },

  async getTicketById(id: string): Promise<Ticket> {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user?.id) throw new Error('Not authenticated');

    const { data: ticket, error } = await db
      .from('tickets')
      .select('*, comments(*)')
      .eq('id', id)
      .eq('customer_id', session.user.id)
      .single();

    if (error) throw error;
    if (!ticket) throw new Error('Ticket not found');

    return ticket;
  },

  async addComment(ticketId: string, content: string): Promise<TicketComment> {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user?.id) throw new Error('Not authenticated');

    // Verify ticket ownership
    const { data: ticket, error: ticketError } = await db
      .from('tickets')
      .select('id')
      .eq('id', ticketId)
      .eq('customer_id', session.user.id)
      .single();

    if (ticketError || !ticket) throw new Error('Ticket not found');

    // Add comment
    const { data: comment, error } = await db.from('ticket_comments').insert({
      ticket_id: ticketId,
      content,
      user_id: session.user.id,
      is_internal: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single();

    if (error) throw error;

    // Update ticket updated_at
    await db
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    return comment;
  },

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.user?.id) throw new Error('Not authenticated');

    // Verify ticket ownership
    const { data: ticket, error: ticketError } = await db
      .from('tickets')
      .select('id, status')
      .eq('id', ticketId)
      .eq('customer_id', session.user.id)
      .single();

    if (ticketError || !ticket) throw new Error('Ticket not found');

    // Validate status transition
    const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
      'open': ['closed' as TicketStatus],
      'in_progress': ['closed' as TicketStatus],
      'resolved': ['closed' as TicketStatus, 'open' as TicketStatus],
      'closed': ['open' as TicketStatus],
    };

    if (!allowedTransitions[ticket.status as TicketStatus]?.includes(status)) {
      throw new Error('Invalid status transition');
    }

    // Update status
    const { error } = await db
      .from('tickets')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) throw error;
  },
}; 