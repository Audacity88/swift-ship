import type { CustomFieldValue } from './custom-field'
import { User } from './user'
import { z } from 'zod'

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  AWAITING_RESPONSE = 'awaiting_response',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export type TicketType = 'question' | 'problem' | 'incident' | 'task'

export interface Customer {
  id: string
  name: string
  email: string
  avatar?: string
  company?: string
}

export interface Agent {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'agent' | 'admin'
}

export interface Message {
  id: string
  content: string
  createdAt: string
  author: Customer | Agent
  attachments?: {
    id: string
    name: string
    url: string
    type: string
  }[]
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface TicketMetadata {
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags: Tag[]
  category?: string
  source: 'email' | 'web' | 'phone' | 'chat'
  customFields: CustomFieldValue[]
  archivedAt?: string
  archivedBy?: Agent
  archiveReason?: string
  lastSnapshotAt?: string
}

export interface TicketSnapshot {
  id: string
  ticketId: string
  snapshotAt: string
  data: Omit<Ticket, 'snapshots'>
  reason?: string
  triggeredBy: Agent
}

export interface TicketComment {
  id: string
  ticketId: string
  content: string
  user: User
  isInternal: boolean
  createdAt: string
  updatedAt: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  type: TicketType
  isArchived: boolean
  metadata: {
    createdAt: string
    updatedAt: string
    lastSnapshotAt?: string
    archivedAt?: string
    archivedBy?: Agent
    archiveReason?: string
    tags: Tag[]
    customFields?: Record<string, any>
    company?: string
  }
  customerId: string
  assigneeId?: string
  customer: User
  assignee?: User
  comments: TicketComment[]
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export interface TicketListItem {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  type: TicketType
  customer: Customer
  assignee?: Agent
  createdAt: string
  updatedAt: string
  tags: Tag[]
}

export const ticketFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  type: z.string().nullish(),
  search: z.string().nullish(),
  dateFrom: z.string().nullish(),
  dateTo: z.string().nullish(),
  unassigned: z.boolean().optional()
}) 