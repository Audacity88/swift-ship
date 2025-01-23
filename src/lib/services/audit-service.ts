import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import type { AuditLog } from '@/types/audit'

export const auditService = {
  async getAuditLogs(context: ServerContext): Promise<AuditLog[]> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch audit logs:', error)
        throw error
      }

      return data as AuditLog[]
    } catch (error) {
      console.error('Error in getAuditLogs:', error)
      throw error
    }
  },

  async createAuditLog(context: ServerContext, log: Partial<AuditLog>): Promise<void> {
    try {
      const supabase = getServerSupabase(context)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Unauthorized')
      }

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          ...log,
          created_by: session.user.id,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to create audit log:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in createAuditLog:', error)
      throw error
    }
  },
}