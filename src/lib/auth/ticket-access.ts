interface TicketOwner {
  customer_id: string
  assignee_id: string | null
}

interface AgentRole {
  role: string
}

// Roles come from the agents table, never caller-controlled Auth metadata.
export function canAccessTicket(userId: string, agent: AgentRole | null, ticket: TicketOwner): boolean {
  if (agent) return agent.role === 'admin' || ticket.assignee_id === userId
  return ticket.customer_id === userId
}

export async function getTicketAgent(supabase: any, userId: string): Promise<AgentRole | null> {
  const { data, error } = await supabase.from('agents').select('role').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function requireTicketAccess(supabase: any, userId: string, ticketId: string): Promise<void> {
  const { data: ticket, error } = await supabase.from('tickets')
    .select('customer_id, assignee_id').eq('id', ticketId).single()
  if (error) throw error
  const agent = await getTicketAgent(supabase, userId)
  if (!ticket || !canAccessTicket(userId, agent, ticket)) throw new Error('Forbidden')
}
