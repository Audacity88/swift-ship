export type AuditLogAction = 'INSERT' | 'UPDATE' | 'DELETE'

export type AuditLogActorType = 'customer' | 'agent' | 'system'

export interface AuditLogActor {
  id: string
  type: AuditLogActorType
  name?: string
  email?: string
}

export interface AuditLogChanges {
  old?: Record<string, any>
  new?: Record<string, any>
  changed_fields?: Record<string, any>
}

export interface AuditLogMetadata {
  timestamp: string
  client_info?: string
  ip_address?: string
  user_agent?: string
}

export interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  action: AuditLogAction
  actor: AuditLogActor
  changes: AuditLogChanges
  metadata: AuditLogMetadata
  created_at: string
}

export interface AuditLogFilters {
  entity_type?: string[]
  entity_id?: string
  actor_type?: AuditLogActorType[]
  actor_id?: string
  action?: AuditLogAction[]
  date_from?: string
  date_to?: string
  search?: string
}

export interface AuditLogSort {
  field: 'created_at' | 'entity_type' | 'action' | 'actor.name'
  direction: 'asc' | 'desc'
}

export interface AuditLogPagination {
  page: number
  per_page: number
  total: number
}

export interface AuditLogResponse {
  data: AuditLog[]
  pagination: AuditLogPagination
} 