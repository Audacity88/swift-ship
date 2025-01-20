export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

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
}

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  type: TicketType
  customer: Customer
  assignee?: Agent
  messages: Message[]
  followers: Agent[]
  metadata: TicketMetadata
  linkedProblems?: string[] // IDs of linked tickets
}

export interface TicketListItem {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  customer: Customer
  assignee?: Agent
  createdAt: string
  updatedAt: string
  tags: Tag[]
} 