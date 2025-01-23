import { getServerSupabase } from '@/lib/supabase-client'

export const createClient = () => {
  return getServerSupabase()
} 