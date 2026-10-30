/* eslint-disable @typescript-eslint/no-require-imports -- Direct Node CommonJS script. */
// Local-only smoke. Keys and random passwords remain in process memory.
// Start Supabase first. Add --app-url http://localhost:3000 to check the app API.
const { execFileSync } = require('node:child_process')
const { requireTool } = require('./local-toolchain.cjs')
const supabaseBin = requireTool('supabase', 'SUPABASE_BIN')
const { randomUUID } = require('node:crypto')
const { createClient } = require('@supabase/supabase-js')
const { createServerClient } = require('@supabase/ssr')

let stage = 'local status'
let service
const created = []
const shipmentIds = []
const check = (condition, message) => { if (!condition) throw new Error(message) }
const pass = message => console.log(`PASS ${message}`)

async function main() {
  const status = JSON.parse(execFileSync(supabaseBin, ['status', '-o', 'json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }))
  check(['localhost', '127.0.0.1'].includes(new URL(status.API_URL).hostname), 'This smoke only runs against local Supabase')
  service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const password = randomUUID() + 'aA1!'
  const suffix = randomUUID()
  const adminEmail = `cyclops-admin-${suffix}@example.test`
  const customerEmail = `cyclops-customer-${suffix}@example.test`
  stage = 'first admin bootstrap'
  const bootstrap = execFileSync(process.execPath, ['scripts/create-admin.js', '--email', adminEmail, '--name', 'Cyclops admin'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: status.API_URL, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, ADMIN_PASSWORD: password },
  })
  check(bootstrap.includes('Admin created.'), 'Admin bootstrap did not report success')
  const adminClient = createClient(status.API_URL, status.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: adminAuth, error: adminSignInError } = await adminClient.auth.signInWithPassword({ email: adminEmail, password })
  check(!adminSignInError && adminAuth.user, 'Admin sign-in failed')
  created.push(adminAuth.user.id)
  const { data: agent, error: agentError } = await adminClient.from('agents').select('role').eq('id', adminAuth.user.id).maybeSingle()
  check(!agentError && agent?.role === 'admin', 'Admin profile was not created')
  pass('create-admin creates an auth account and admin agent; password sign-in succeeds')

  stage = 'customer signup trigger'
  const jar = new Map()
  const customer = createServerClient(status.API_URL, status.ANON_KEY, {
    auth: { autoRefreshToken: false },
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value }) => jar.set(name, value)),
    },
  })
  const { data: signup, error: signupError } = await customer.auth.signUp({
    email: customerEmail, password, options: { data: { name: 'Cyclops customer', company: 'Local smoke' } },
  })
  check(!signupError && signup.user && signup.session, 'Customer signup failed or local email confirmation is enabled')
  created.push(signup.user.id)
  const { data: profile, error: profileError } = await customer.from('customers').select('id,name,company').eq('id', signup.user.id).maybeSingle()
  check(!profileError && profile?.id === signup.user.id && profile.name === 'Cyclops customer', 'Signup trigger did not create the customer')
  pass('signup immediately creates the matching customer profile with metadata name')

  stage = 'customer sign-in'
  await customer.auth.signOut()
  const { data: signedIn, error: signInError } = await customer.auth.signInWithPassword({ email: customerEmail, password })
  check(!signInError && signedIn.user?.id === signup.user.id, 'Customer sign-in failed')
  pass('customer can sign out and sign in with a usable profile')

  stage = 'customer profile persistence'
  const { error: saveError } = await customer.from('customers').update({ name: 'Cyclops saved', company: 'Saved company', job_title: 'Tester', preferences: { language: 'en', timezone: 'UTC' } }).eq('id', signup.user.id)
  const { data: saved, error: readError } = await customer.from('customers').select('name,company,job_title,preferences').eq('id', signup.user.id).maybeSingle()
  check(!saveError && !readError && saved?.name === 'Cyclops saved' && saved?.job_title === 'Tester' && saved?.preferences?.timezone === 'UTC', 'Profile update did not persist')
  pass('customer profile fields and preferences persist after a new query')

  stage = 'customer privilege escalation denial'
  const { error: escalateError } = await customer.from('agents').insert({ id: signup.user.id, email: customerEmail, name: 'Customer', role: 'admin' })
  check(!!escalateError, 'Customer could insert an admin agent')
  pass('customer cannot insert themselves into agents')

  const appIndex = process.argv.indexOf('--app-url')
  if (appIndex !== -1) {
    const appURL = process.argv[appIndex + 1]
    check(['localhost', '127.0.0.1'].includes(new URL(appURL).hostname), 'App URL must be local')
    const cookieHeader = [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
    const headers = { Cookie: cookieHeader, 'Content-Type': 'application/json' }
    stage = 'portal profile API prefill'
    const response = await fetch(`${appURL}/api/portal/profile`, { headers })
    const body = await response.json()
    check(response.ok && body.id === signup.user.id && body.name === 'Cyclops saved', 'Profile API did not return the signed-in customer')
    pass('GET /api/portal/profile returns customer data for form prefill')
    stage = 'portal profile API save'
    const update = await fetch(`${appURL}/api/portal/profile`, {
      method: 'PUT', headers, body: JSON.stringify({ name: 'Saved via API', company: 'API company', jobTitle: 'API tester' }),
    })
    check(update.ok, 'Profile API save failed')
    const verify = await fetch(`${appURL}/api/portal/profile`, { headers })
    const verified = await verify.json()
    check(verify.ok && verified.name === 'Saved via API' && verified.job_title === 'API tester', 'Profile API changes did not persist')
    pass('PUT /api/portal/profile saves whitelisted fields and GET returns them')
    stage = 'missing profile code fallback'
    const { error: removeProfileError } = await service.from('customers').delete().eq('id', signup.user.id)
    check(!removeProfileError, 'Unable to prepare missing-profile check')
    const fallback = await fetch(`${appURL}/api/portal/profile`, { headers })
    const recovered = await fallback.json()
    check(fallback.ok && recovered.id === signup.user.id, 'Missing-profile code fallback failed')
    pass('profile API recreates an older account missing its customer profile')
    stage = 'admin API protection'
    for (const [path, method, body] of [
      ['/api/agents', 'POST', { name: 'Escalate', email: customerEmail, role: 'admin' }],
      [`/api/agents?id=${adminAuth.user.id}`, 'DELETE', undefined],
      [`/api/agents/${adminAuth.user.id}`, 'PUT', { name: 'Escalate', email: adminEmail, role: 'admin' }],
      [`/api/auth/users?email=${encodeURIComponent(adminEmail)}`, 'DELETE', undefined],
    ]) {
      const denied = await fetch(`${appURL}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) })
      check(denied.status === 403, 'Customer reached a privileged account management API')
    }
    pass('customer agent create, update, delete and auth user delete requests return 403')
    stage = 'ordinary agent cannot delete staff'
    const agentEmail = `cyclops-agent-${suffix}@example.test`
    const { data: agentAuth, error: agentAuthError } = await service.auth.admin.createUser({
      email: agentEmail, password, email_confirm: true, app_metadata: { staff: true },
    })
    check(!agentAuthError && agentAuth.user, 'Unable to prepare ordinary agent')
    created.push(agentAuth.user.id)
    const { error: agentProfileError } = await service.from('agents').insert({ id: agentAuth.user.id, email: agentEmail, name: 'Cyclops agent', role: 'agent' })
    check(!agentProfileError, 'Unable to prepare ordinary agent profile')
    const agentJar = new Map()
    const ordinaryAgent = createServerClient(status.API_URL, status.ANON_KEY, {
      auth: { autoRefreshToken: false },
      cookies: {
        getAll: () => [...agentJar].map(([name, value]) => ({ name, value })),
        setAll: values => values.forEach(({ name, value }) => agentJar.set(name, value)),
      },
    })
    const { error: ordinarySignInError } = await ordinaryAgent.auth.signInWithPassword({ email: agentEmail, password })
    check(!ordinarySignInError, 'Ordinary agent sign-in failed')
    const agentCookies = [...agentJar].map(([name, value]) => `${name}=${value}`).join('; ')
    const agentDelete = await fetch(`${appURL}/api/agents?id=${adminAuth.user.id}`, { method: 'DELETE', headers: { Cookie: agentCookies } })
    check(agentDelete.status === 403, 'Ordinary agent reached agent deletion')
    await ordinaryAgent.auth.signOut()
    pass('ordinary agents cannot delete other agents through the API')
    stage = 'customer shipment API'
    const emptyShipments = await fetch(`${appURL}/api/shipments`, { headers })
    const emptyShipmentsBody = await emptyShipments.json()
    check(emptyShipments.ok && emptyShipmentsBody.total === 0, 'New customer shipment list was not empty')
    const shipmentResponse = await fetch(`${appURL}/api/shipments`, {
      method: 'POST', headers, body: JSON.stringify({ customer_id: signup.user.id, type: 'full_truckload', origin: 'Local origin', destination: 'Local destination' }),
    })
    const shipment = await shipmentResponse.json()
    if (shipment.id) shipmentIds.push(shipment.id)
    check(shipmentResponse.status === 201 && shipment.id, 'Customer shipment creation failed')
    const listedShipments = await fetch(`${appURL}/api/shipments`, { headers })
    const listedShipmentsBody = await listedShipments.json()
    check(listedShipments.ok && listedShipmentsBody.total === 1 && listedShipmentsBody.shipments[0]?.id === shipment.id, 'Created shipment did not appear in the list')
    pass('customer shipment API returns empty state, creates an own shipment, and lists it')
    stage = 'role-protected pages'
    for (const path of ['/tickets/queue', '/settings/roles', '/admin/setup']) {
      const page = await fetch(`${appURL}${path}`, { headers, redirect: 'manual' })
      check(page.status === 307 && new URL(page.headers.get('location'), appURL).pathname === '/403', `Customer was not denied at ${path}`)
    }
    pass('customers are redirected to /403 from queue, roles and admin setup pages')
    stage = 'public registration route'
    const registration = await fetch(`${appURL}/portal/auth/register`, { redirect: 'manual' })
    check(registration.status === 200, 'Public customer registration route is unavailable')
    pass('signed-out /portal/auth/register is reachable')
  }
  await customer.auth.signOut()
  await adminClient.auth.signOut()
}

main().catch(() => { console.error(`FAIL auth smoke at ${stage}. Sensitive error details suppressed.`); process.exitCode = 1 }).finally(async () => {
  if (!service) return
  let failed = false
  for (const id of shipmentIds) {
    const { error } = await service.from('shipments').delete().eq('id', id)
    failed ||= !!error
  }
  for (const id of created.reverse()) {
    const { error: agentError } = await service.from('agents').delete().eq('id', id)
    const { error: customerError } = await service.from('customers').delete().eq('id', id)
    const { error: authError } = await service.auth.admin.deleteUser(id)
    failed ||= !!agentError || !!customerError || !!authError
  }
  if (failed) { console.error('FAIL temporary account cleanup. Check local smoke accounts before resetting.'); process.exitCode = 1 }
  else pass('temporary smoke accounts removed')
})
