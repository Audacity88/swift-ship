// Local integration smoke for the actual ticket services. Does not edit Jest tests.
// Credentials and passwords stay in process memory. Temporary fixtures are removed after the smoke check.
const { execFileSync } = require('node:child_process')
const { requireTool } = require('./local-toolchain.cjs')
const supabaseBin = requireTool('supabase', 'SUPABASE_BIN')
const { randomUUID } = require('node:crypto')
const { resolve } = require('node:path')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
const { createClient } = require('@supabase/supabase-js')
const { createServerClient } = require('@supabase/ssr')
let stage = 'status'
let activeClient
let service
const users = []
const tickets = []
const teams = []
const clients = []
const subscriptions = []
const check = (value, label) => { if (!value) throw new Error(label) }
const pass = label => console.log(`PASS ${label}`)
const expectLive = async (events, predicate, startedAt, label) => {
  while (Date.now() - startedAt < 10000) {
    if (events.some(event => predicate(event.row) && event.receivedAt - startedAt < 10000)) {
      pass(label)
      return
    }
    await new Promise(resolve => setTimeout(resolve, 25))
  }
  throw new Error('App realtime helper did not deliver within 10 seconds')
}
const originalResolve = Module._resolveFilename
const originalTS = require.extensions['.ts']
const adapterId = resolve('.tmp-service-adapter.cjs')
require.cache[adapterId] = { id: adapterId, filename: adapterId, loaded: true, exports: { getServerSupabase: () => activeClient } }
Module._resolveFilename = function (name, ...args) {
  if (name === '@/lib/supabase-client') return adapterId
  if (name.startsWith('@/')) name = resolve('src', name.slice(2))
  return originalResolve.call(this, name, ...args)
}
require.extensions['.ts'] = (mod, file) => {
  const source = fs.readFileSync(file, 'utf8')
  mod._compile(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, file)
}

async function main() {
  const status = JSON.parse(execFileSync(supabaseBin, ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
  check(['localhost', '127.0.0.1'].includes(new URL(status.API_URL).hostname), 'Local stack only')
  service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const password = randomUUID() + 'aA1!'
  const makeClient = () => {
    const jar = new Map()
    const client = createServerClient(status.API_URL, status.ANON_KEY, { auth: { autoRefreshToken: false }, cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value }) => jar.set(name, value)),
    } })
    clients.push(client)
    return { client, headers: () => ({ Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '), 'Content-Type': 'application/json' }) }
  }
  stage = 'customer fixture'
  const customer = makeClient()
  const customerEmail = `cyclops-ticket-${randomUUID()}@example.test`
  const signup = await customer.client.auth.signUp({ email: customerEmail, password, options: { data: { name: 'Ticket smoke' } } })
  check(!signup.error && signup.data.user, 'Signup failed')
  const customerId = signup.data.user.id
  users.push(customerId)
  stage = 'admin fixture'
  const adminEmail = `cyclops-ticket-admin-${randomUUID()}@example.test`
  const created = await service.auth.admin.createUser({ email: adminEmail, password, email_confirm: true, app_metadata: { staff: true } })
  check(!created.error && created.data.user, 'Admin create failed')
  const adminId = created.data.user.id
  users.push(adminId)
  const agent = await service.from('agents').insert({ id: adminId, email: adminEmail, name: 'Ticket admin', role: 'admin' })
  check(!agent.error, 'Admin profile failed')
  const admin = makeClient()
  const login = await admin.client.auth.signInWithPassword({ email: adminEmail, password })
  check(!login.error, 'Admin signin failed')

  const { customerTicketService } = require('../src/lib/services/customer-ticket-service.ts')
  const { ticketService } = require('../src/lib/services/ticket-service.ts')
  const { conversationService, validateAttachments, ATTACHMENT_TYPES } = require('../src/lib/services/conversation-service.ts')
  for (const [extension, mimes] of Object.entries(ATTACHMENT_TYPES)) {
    for (const type of mimes) validateAttachments([new File(['local fixture'], `allowed.${extension}`, { type })])
  }
  for (const name of ['blocked.html', 'blocked.htm', 'blocked.svg', 'blocked.js', 'blocked.mjs', 'blocked.exe', 'blocked.sh', 'blocked.bat', 'blocked.msi', 'blocked.xml', 'blocked.xhtml', 'blocked.unknown', 'blocked.__proto__', 'blocked.constructor']) {
    let rejected = false
    try { validateAttachments([new File(['blocked'], name, { type: 'text/plain' })]) }
    catch (error) { rejected = /Unsupported attachment type/.test(error.message) }
    check(rejected, 'Client validation accepted a forbidden extension')
  }
  for (const type of ['text/html', 'text/plain', '']) {
    let rejected = false
    try { validateAttachments([new File(['blocked'], 'spoofed.png', { type })]) }
    catch (error) { rejected = /Unsupported attachment type/.test(error.message) }
    check(rejected, 'Client validation accepted a missing/mismatched MIME')
  }
  pass('client allowlist accepts supported extension/MIME pairs and rejects forbidden names, MIME mismatches and unknown types')
  const { statusWorkflow } = require('../src/lib/services/status-workflow.ts')
  activeClient = customer.client
  stage = 'create customer ticket'
  const ticket = await customerTicketService.createTicket(undefined, { title: 'Cyclops local smoke', description: 'Original customer description', priority: 'medium' })
  tickets.push(ticket.id)
  pass('customer service creates a ticket without an invalid welcome agent')
  stage = 'app attachment original-filename download'
  const originalName = 'report & draft#1 + 100%.png'
  const attachments = await conversationService.uploadAttachments(undefined, ticket.id, [new File(['local fixture'], originalName, { type: 'image/png' })])
  try {
    const url = await conversationService.getAttachmentUrl(undefined, attachments[0])
    check(new URL(url).searchParams.get('download') === originalName && new URL(url).hash === '', 'Original filename became URL syntax')
    const download = await fetch(url)
    check(download.ok && /^attachment;/i.test(download.headers.get('content-disposition') || ''), 'Attachment download disposition missing')
    check(await download.text() === 'local fixture', 'Attachment content changed')
  } finally { await conversationService.removeAttachments(undefined, attachments) }
  pass('app signed download preserves original special-character filename and attachment disposition')
  stage = 'app conversation realtime subscriptions'
  const customerMessages = []
  const staffMessages = []
  const customerTickets = []
  const capture = events => row => events.push({ row, receivedAt: Date.now() })
  subscriptions.push(await conversationService.subscribeToMessages(undefined, ticket.id, capture(customerMessages)))
  subscriptions.push(await conversationService.subscribeToTicket(undefined, ticket.id, capture(customerTickets)))
  activeClient = admin.client
  subscriptions.push(await conversationService.subscribeToMessages(undefined, ticket.id, capture(staffMessages)))
  activeClient = customer.client
  pass('app conversation helpers authenticate and wait for PostgreSQL readiness on three unique channels')
  stage = 'customer ticket list'
  const list = await customerTicketService.getCustomerTickets(undefined, { page: 1 })
  check(list.tickets.some(t => t.id === ticket.id && t.createdAt) && list.pagination.total >= 1, 'Ticket list omitted created ticket')
  pass('customer ticket list returns persisted ticket and mapped dates')
  stage = 'original description'
  let thread = await conversationService.getMessages(undefined, ticket.id)
  check(thread[0]?.content === 'Original customer description', 'Original description absent')
  pass('customer conversation begins with original description')
  stage = 'customer reply'
  const customerSentAt = Date.now()
  const customerReply = await customerTicketService.addComment(undefined, ticket.id, 'Customer follow-up')
  await expectLive(staffMessages, row => row.id === customerReply.id, customerSentAt, 'app message helper delivers customer reply to staff within 10 seconds')
  activeClient = admin.client
  stage = 'admin ticket list'
  const staffList = await ticketService.fetchTickets(undefined)
  check(staffList.data.some(t => t.id === ticket.id), 'Untagged ticket excluded')
  pass('agent list includes untagged tickets')
  stage = 'agent replies'
  thread = await conversationService.getMessages(undefined, ticket.id)
  check(thread[0]?.content === 'Original customer description' && thread.some(m => m.content === 'Customer follow-up'), 'Agent thread missing customer messages')
  const agentSentAt = Date.now()
  const reply = await conversationService.addMessage(undefined, ticket.id, 'Saved agent reply', 'agent')
  check(reply.id && reply.content === 'Saved agent reply', 'Reply service failed to return saved message')
  pass('agent conversation includes original description and reply returns saved data')
  await expectLive(customerMessages, row => row.id === reply.id, agentSentAt, 'app message helper delivers staff reply to customer within 10 seconds')
  const internalSentAt = Date.now()
  const internalReply = await conversationService.addMessage(undefined, ticket.id, 'Private agent note', 'agent', undefined, true)
  await expectLive(staffMessages, row => row.id === internalReply.id, internalSentAt, 'app message helper delivers internal note to staff')
  stage = 'status workflow'
  const transitions = await statusWorkflow.getAvailableTransitions(undefined, ticket.id, 'open')
  check(transitions.some(t => t.toStatus === 'in_progress'), 'Menu missing In Progress')
  const statusChangedAt = Date.now()
  await statusWorkflow.executeTransition(undefined, ticket.id, 'open', 'in_progress', { id: adminId, name: 'Admin', email: adminEmail, role: 'admin' })
  const updated = await admin.client.from('tickets').select('status').eq('id', ticket.id).maybeSingle()
  check(!updated.error && updated.data?.status === 'in_progress', 'Transition did not persist')
  pass('offered open to in_progress transition persists through shared workflow RPC')
  await expectLive(customerTickets, row => row.id === ticket.id && row.status === 'in_progress', statusChangedAt, 'app ticket helper delivers customer status change within 10 seconds')
  check(!customerMessages.some(event => event.row.id === internalReply.id), 'App helper disclosed internal note to customer')
  pass('app customer message helper excludes internal notes')
  activeClient = customer.client
  stage = 'customer reply visibility'
  thread = await conversationService.getMessages(undefined, ticket.id)
  check(thread.some(m => m.id === reply.id) && !thread.some(m => m.content === 'Private agent note'), 'Reply or internal note RLS failed')
  pass('customer sees saved replies and cannot see internal notes')

  activeClient = admin.client
  stage = 'team agent picker and member names'
  const { teamService } = require('../src/lib/services/team-service.ts')
  const availableAgents = await teamService.getAvailableAgents(undefined)
  check(availableAgents.some(agent => agent.id === adminId && agent.name === 'Ticket admin' && agent.email === adminEmail), 'Agent picker omitted name or email')
  const createdTeam = await teamService.createTeam(undefined, { name: 'Cyclops team smoke', schedule: {}, members: [{ userId: adminId, role: 'supervisor', schedule: {}, skills: [] }] })
  check(createdTeam?.id, 'Team service creation failed')
  teams.push(createdTeam.id)
  const memberLists = [
    await teamService.getTeamMembers(undefined, createdTeam.id),
    (await teamService.getTeamById(undefined, createdTeam.id))?.members,
    (await teamService.getAllTeams(undefined)).find(team => team.id === createdTeam.id)?.members,
  ]
  check(memberLists.every(members => members?.some(member => member.userId === adminId && member.name === 'Ticket admin' && member.email === adminEmail && member.role === 'supervisor')), 'Team queries omitted lead name or email')
  pass('team picker and all member/lead queries return agent names and emails')

  activeClient = admin.client
  stage = 'empty team and agent metrics'
  const { metricsService } = require('../src/lib/services/metrics-service.ts')
  const teamMetrics = await metricsService.getTeamMetrics(undefined, randomUUID(), 'week')
  const agentMetrics = await metricsService.getAgentMetrics(undefined, adminId, 'week')
  check(teamMetrics.current.open_tickets === 0 && teamMetrics.trends.responseTime === 0 && agentMetrics.current.agent_id === adminId && agentMetrics.current.tickets_handled === 0, 'Missing metrics did not produce safe defaults')
  pass('new-team and new-agent metrics return empty defaults without 406 errors')

  const appIndex = process.argv.indexOf('--app-url')
  if (appIndex !== -1) {
    const app = process.argv[appIndex + 1]
    check(['localhost', '127.0.0.1'].includes(new URL(app).hostname), 'Local app only')
    stage = 'ticket stats API'
    const range = `from=${new Date(Date.now() - 86400000).toISOString()}&to=${new Date(Date.now() + 86400000).toISOString()}`
    const statsResponse = await fetch(`${app}/api/tickets/stats?${range}`, { headers: admin.headers() })
    const stats = await statsResponse.json()
    check(statsResponse.ok && stats.totalConversations >= 1 && stats.detailedStats.counts.status.in_progress >= 1, 'Stats shape/count wrong')
    pass('admin ticket stats API returns real counts in the overview contract')
    const denied = await fetch(`${app}/api/tickets/stats?${range}`, { headers: customer.headers() })
    check(denied.status === 403, 'Customer stats not denied')
    pass('customer cannot access staff stats endpoint')
    stage = 'read-only customer SLA API'
    const sla = await fetch(`${app}/api/tickets/${ticket.id}/sla`, { headers: customer.headers() })
    check(sla.ok && (await sla.json()).data.name, 'SLA read failed')
    const pause = await fetch(`${app}/api/tickets/${ticket.id}/sla`, { method: 'POST', headers: customer.headers(), body: JSON.stringify({ reason: 'unauthorized' }) })
    check(pause.status === 403, 'Customer could pause SLA')
    pass('customer can read own SLA but cannot pause it')
    stage = 'AI optional key'
    const ai = await fetch(`${app}/api/ai-support`, { method: 'POST', headers: customer.headers(), body: JSON.stringify({ message: 'Help', agentType: 'support' }) })
    check(ai.ok && (await ai.text()).includes('AI not configured'), 'Missing optional AI key did not degrade clearly')
    pass('AI support returns clear AI not configured response with empty key')
    const anon = await fetch(`${app}/api/ai-support`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Help' }) })
    check(anon.status === 401, 'Anon AI endpoint access')
    pass('anonymous AI requests are rejected')
  }
}

main().catch(() => { console.error(`FAIL ticket smoke at ${stage}. Sensitive details suppressed.`); process.exitCode = 1 }).finally(async () => {
  for (const unsubscribe of subscriptions) unsubscribe()
  let channelsRemoved = true
  for (const client of clients) {
    await client.removeAllChannels()
    channelsRemoved &&= client.getChannels().length === 0
    await client.auth.signOut()
  }
  if (!channelsRemoved) { console.error('FAIL app subscription cleanup'); process.exitCode = 1 }
  else if (subscriptions.length) pass('app subscription cleanup removes channels before signing out')
  Module._resolveFilename = originalResolve
  if (originalTS) require.extensions['.ts'] = originalTS
  else delete require.extensions['.ts']
  if (!service) return
  let failed = false
  for (const id of tickets) {
    for (const table of ['messages', 'status_history', 'ticket_history', 'sla_pauses', 'sla_states', 'sla_status', 'ticket_custom_fields', 'ticket_tags', 'ticket_followers', 'ticket_snapshots']) {
      const result = await service.from(table).delete().eq('ticket_id', id)
      failed ||= !!result.error
    }
    const result = await service.from('tickets').delete().eq('id', id)
    failed ||= !!result.error
  }
  for (const id of teams) {
    const members = await service.from('team_members').delete().eq('team_id', id)
    const team = await service.from('teams').delete().eq('id', id)
    failed ||= !!members.error || !!team.error
  }
  for (const id of users.reverse()) {
    const a = await service.from('agents').delete().eq('id', id)
    const c = await service.from('customers').delete().eq('id', id)
    const u = await service.auth.admin.deleteUser(id)
    failed ||= !!a.error || !!c.error || !!u.error
  }
  if (failed) { console.error('FAIL fixture cleanup. Run supabase db reset to remove smoke fixtures.'); process.exitCode = 1 }
  else pass('temporary ticket and account fixtures removed')
})
