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
export { quoteService } from './quote-service'
export { shipmentService } from './shipment-service'
export { authService } from './auth-service'
export { conversationService } from './conversation-service'
export { userService } from './user-service'
export { customerService } from './customer-service'
export { quoteCalculationService, type ServiceType, type ServiceOption } from './quote-calculation-service'
export { quoteMetadataService } from './quote-metadata-service'

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
export { SERVICE_RATES } from './quote-calculation-service'

// Types
export type { Ticket, TicketListItem, TicketStatus } from '@/types/ticket'
export type { RoleType, Permission } from '@/types/role'
export type { SearchRequest } from '@/types/search'
export type { QuoteRequest } from '@/types/quote'
export type { Message } from './conversation-service'
export type { Shipment, ShipmentEvent, ShipmentStatus } from '@/types/shipment'
export type { User } from './user-service'
export type { Customer } from './customer-service'
export type { TicketRelationship } from './ticket-service' 