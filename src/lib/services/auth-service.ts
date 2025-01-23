import { getServerSupabase, type ServerContext } from '@/lib/supabase-client'

export const authService = {
  async getUser(context: ServerContext) {
    try {
      const supabase = getServerSupabase(context)
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
      pkceVerifier?: string
      pkceChallenge?: string
      pkceChallengeMethod?: 'S256'
    }
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getServerSupabase(context)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
        options: {
          pkceVerifier: data.pkceVerifier,
          pkceChallenge: data.pkceChallenge,
          pkceChallengeMethod: data.pkceChallengeMethod
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      // Verify user immediately after sign in
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return { success: false, error: 'Failed to verify user authentication' }
      }

      return { success: true }
    } catch (err) {
      console.error('Sign in error:', err)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }
} 