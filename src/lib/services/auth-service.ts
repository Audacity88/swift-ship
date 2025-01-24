import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'
import { createBrowserClient } from '@supabase/ssr'

const getBrowserSupabase = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const authService = {
  async getUser(context: ServerContext) {
    try {
      const supabase = context ? getServerSupabase(context) : getBrowserSupabase()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth error:', userError)
        return { user: null, error: userError }
      }

      return { user, error: null }
    } catch (error) {
      console.error('Auth error:', error)
      return { user: null, error }
    }
  },

  async resetPassword(context: ServerContext, emailOrPassword: string) {
    const supabase = getServerSupabase(context)
    
    // If it looks like an email, send reset instructions
    if (emailOrPassword.includes('@')) {
      const { error } = await supabase.auth.resetPasswordForEmail(emailOrPassword, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      if (error) throw error
    } else {
      // Otherwise update the password
      const { error } = await supabase.auth.updateUser({
        password: emailOrPassword
      })
      if (error) throw error
    }
  },

  async registerCustomer(
    context: ServerContext,
    data: {
      email: string
      password: string
      name: string
      company?: string
    }
  ) {
    const supabase = getServerSupabase(context)
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          company: data.company,
          role: 'customer'
        }
      }
    })
    if (error) throw error
    return authData
  },

  async signInWithProvider(
    context: ServerContext, 
    provider: 'google' | 'github',
    options?: { redirectTo?: string }
  ) {
    const supabase = getServerSupabase(context)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: options?.redirectTo,
      },
    })
    if (error) throw error
  },

  async signOut(context: ServerContext) {
    const supabase = getServerSupabase(context)
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async signIn(
    context: ServerContext,
    data: {
      email: string
      password: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = getBrowserSupabase()
      console.log('[Auth Service] Attempting sign in for:', data.email)

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (error) {
        console.error('[Auth Service] Sign in error:', error)
        return { success: false, error: error.message }
      }

      if (!signInData.session) {
        console.error('[Auth Service] No session returned')
        return { success: false, error: 'No session returned from sign in' }
      }

      console.log('[Auth Service] Sign in successful, session established')
      return { success: true }
    } catch (err) {
      console.error('[Auth Service] Unexpected error:', err)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }
} 