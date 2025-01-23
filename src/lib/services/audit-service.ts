import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types/audit'

export const auditService = {
  async getAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch audit logs:', error)
      return []
    }
    return data as AuditLog[]
  },

  async createAuditLog(log: Partial<AuditLog>): Promise<boolean> {
    const { error } = await supabase
      .from('audit_logs')
      .insert(log)

    if (error) {
      console.error('Failed to create audit log:', error)
      return false
    }
    return true
  },
}