// Service Objects
export { ticketService } from './ticket-service'
export { roleService } from './role-service'
export { metricsService } from './metrics-service'
export { tagService } from './tag-service'
export { knowledgeService } from './knowledge-service'
export { slaService } from './sla-service'
export { archiveService } from './archive-service'
export { searchService } from './search-service'
export { teamService } from './team-service'
export { auditService } from './audit-service'
export { customerTicketService } from './customer-ticket-service'
export { statusWorkflow } from './status-workflow'

// Individual Functions - Ticket Service
export {
  fetchTickets,
  createTicket,
  updateTicket,
  getTicket,
  updateTicketStatus,
} from './ticket-service'

// Enums and Constants
export { TicketPriority } from '@/types/ticket'

// Types
export type { Ticket, TicketListItem, TicketStatus } from '@/types/ticket'
export type { RoleType, Permission } from '@/types/role'
export type { SearchRequest } from '@/types/search' 