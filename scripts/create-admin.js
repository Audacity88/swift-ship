#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- Direct Node CommonJS script. */
// Credentials are read only from the process environment or the ignored .env.local.
const { resolve } = require('node:path')
require('dotenv').config({ path: resolve(process.cwd(), '.env.local') })
const { createClient } = require('@supabase/supabase-js')

async function main() {
  const args = process.argv.slice(2)
  const read = flag => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1] }
  const email = read('--email')?.trim().toLowerCase()
  const password = read('--password') || process.env.ADMIN_PASSWORD
  const name = read('--name')?.trim() || email?.split('@')[0]
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 8) {
    throw new Error('Usage: pnpm create-admin --email you@example.com --password <at-least-8-characters> [--name "Your name"]. ADMIN_PASSWORD can supply the password instead.')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or the environment.')
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  let user = null
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw new Error('Unable to list auth users. Check the local Supabase stack and service role key.')
    user = data.users.find(candidate => candidate.email?.toLowerCase() === email)
    if (user || data.users.length < 100) break
  }
  let created = false
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name }, app_metadata: { staff: true },
    })
    if (error || !data.user) throw new Error('Unable to create the admin auth user. Check password policy and Auth configuration.')
    user = data.user
    created = true
  }
  const { error } = await supabase.from('agents').upsert({ id: user.id, email, name, role: 'admin' }, { onConflict: 'id' })
  if (error) {
    if (created) await supabase.auth.admin.deleteUser(user.id)
    throw new Error('Unable to create the admin profile. Apply the database migrations first.')
  }
  // Existing users keep their password and customer data. This command explicitly promotes
  // the supplied account; the agents row is the source of authority for the application.
  console.log(created ? 'Admin created. Sign in with the supplied email and password.' : 'Existing account promoted to admin. Sign in with its existing password.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
