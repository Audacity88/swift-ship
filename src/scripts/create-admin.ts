import { createClient } from '@supabase/supabase-js'
import { UserRole } from '../types/role'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Make sure to use service role key

async function createAdmin() {
  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create auth user
    const { data: authUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: 'dangilles@gmail.com',
      password: 'mango888',
      email_confirm: true,
      user_metadata: {
        name: 'Dan Gilles',
        role: 'admin',
        isAgent: true
      }
    })

    if (createUserError || !authUser.user) {
      throw new Error(`Failed to create auth user: ${createUserError?.message}`)
    }

    console.log('Created auth user:', authUser.user.id)

    // Create agent record
    const { data: agent, error: createAgentError } = await supabase
      .from('agents')
      .insert({
        id: authUser.user.id,
        name: 'Dan Gilles',
        email: 'dangilles@gmail.com',
        role: 'admin' as UserRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createAgentError) {
      // Cleanup auth user if agent creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw new Error(`Failed to create agent record: ${createAgentError.message}`)
    }

    console.log('Successfully created admin user:', agent)
  } catch (error) {
    console.error('Error creating admin:', error)
    process.exit(1)
  }
  process.exit(0)
}

createAdmin() 