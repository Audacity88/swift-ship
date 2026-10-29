import { createClient } from '@supabase/supabase-js'

// Supply credentials privately via the invoking environment; never log tokens.
async function verifySignIn() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const email = process.env.SWIFT_SHIP_TEST_EMAIL
  const password = process.env.SWIFT_SHIP_TEST_PASSWORD
  if (!url || !key || !email || !password) {
    throw new Error('Set Supabase configuration and SWIFT_SHIP_TEST_EMAIL/SWIFT_SHIP_TEST_PASSWORD privately before running this utility')
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('Authentication failed')
  console.log('Authentication succeeded; credentials and tokens are not printed')
  await supabase.auth.signOut({ scope: 'local' })
}

verifySignIn().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
