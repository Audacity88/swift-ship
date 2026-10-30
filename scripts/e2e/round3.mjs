// Run from the repo root after an empty-key `pnpm build`:
//   node scripts/e2e/round3.mjs [--port 3013] [--headed]
// Requires Playwright and its Chromium in this repo, ../verify, or PLAYWRIGHT_MODULE.
// This script starts its own production server with optional provider keys empty.
// It never writes credentials, traces, screenshots, or downloaded files to disk.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'node:net'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(resolve(root, 'package.json'))
const { createClient } = require('@supabase/supabase-js')
const { resolveTool } = require('./scripts/local-toolchain.cjs')
const localHost = value => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname)
const pass = label => console.log(`PASS ${label}`)
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64')
const users = []
const faults = new Set()
const contexts = []
const pageState = new WeakMap()
let stage = 'local toolchain'
let service
let ticketId
let server
let browser
let stopping = false
let app

function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(resolve(process.env.PLAYWRIGHT_MODULE))
  try { return require('playwright') }
  catch { return createRequire(resolve(root, '../verify/package.json'))('playwright') }
}

function monitor(page) {
  const state = { navigations: 0, joined: new Set() }
  pageState.set(page, state)
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) state.navigations++ })
  page.on('pageerror', () => { if (!stopping) faults.add('page exception') })
  page.on('console', message => {
    if (stopping) return
    if (message.type() === 'error') faults.add('browser console error')
    if (/missing.*description|description.*dialogcontent|rendered more hooks|websocket.*fail|realtime.*error/i.test(message.text())) {
      faults.add('hook, dialog description, or realtime warning')
    }
  })
  page.on('websocket', socket => {
    if (!localHost(socket.url())) faults.add('nonlocal websocket')
    socket.on('socketerror', () => { if (!stopping) faults.add('websocket error') })
    socket.on('framereceived', frame => {
      try {
        const data = JSON.parse(String(frame.payload))
        if (data.event !== 'phx_reply' || data.payload?.status !== 'ok') return
        for (const table of ['messages', 'tickets']) {
          if (data.topic?.startsWith(`realtime:${table}:`)) state.joined.add(table)
        }
      } catch { /* Ignore heartbeat/binary frames. Never log frame payloads. */ }
    })
  })
}

async function waitUntil(predicate, timeout = 10000) {
  const deadline = Date.now() + timeout
  while (!predicate()) {
    assert(Date.now() < deadline, 'Condition timed out')
    await delay(50)
  }
}

async function signIn(page, email, password) {
  await page.goto(`${app}/auth/signin`)
  await page.getByLabel('Email address', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/auth/'), { timeout: 60000 })
}

async function openTicket(page, path, title) {
  pageState.get(page).joined.clear()
  await page.goto(`${app}${path}`)
  await page.getByRole('heading', { name: title, exact: true }).waitFor()
  await page.getByPlaceholder('Type your reply...', { exact: true }).waitFor()
  await waitUntil(() => ['messages', 'tickets'].every(table => pageState.get(page).joined.has(table)))
}

async function sendReply(sender, receiver, content, attachmentName) {
  const before = [sender, receiver].map(page => pageState.get(page).navigations)
  if (attachmentName) {
    await sender.locator('input[type="file"]').setInputFiles({ name: attachmentName, mimeType: 'image/png', buffer: png })
  }
  await sender.getByPlaceholder('Type your reply...', { exact: true }).fill(content)
  const sentAt = Date.now()
  await sender.getByRole('button', { name: 'Send message', exact: true }).click()
  await receiver.getByText(content, { exact: true }).waitFor({ timeout: 10000 })
  assert(Date.now() - sentAt < 10000, 'Live reply exceeded ten seconds')
  await sender.waitForFunction(() => document.querySelector('textarea[placeholder="Type your reply..."]')?.value === '')
  assert.deepEqual([sender, receiver].map(page => pageState.get(page).navigations), before, 'Reply required a navigation')
  if (attachmentName) await receiver.getByRole('button', { name: `${attachmentName} (1 KB)`, exact: true }).waitFor()
}

async function signedDownload(page, name, apiURL) {
  const signed = page.waitForResponse(response => response.request().method() === 'POST'
    && new URL(response.url()).pathname.startsWith('/storage/v1/object/sign/ticket-attachments/'))
  await page.getByRole('button', { name: `${name} (1 KB)`, exact: true }).click()
  const response = await signed
  assert(response.ok(), 'Signing download failed')
  const body = await response.json()
  assert(body.signedURL, 'Signed download URL missing')
  const url = new URL(`/storage/v1${body.signedURL}`, apiURL)
  assert(localHost(url), 'Download must stay local')
  const download = await page.context().request.get(url.href)
  assert(download.ok(), 'Signed download failed')
  assert.deepEqual(await download.body(), png, 'Downloaded PNG differs from upload')
}

async function checkAI(page, role) {
  for (const path of ['/ai-support', '/portal/ai-support']) {
    await page.goto(`${app}${path}`)
    await page.getByRole('heading', { name: 'AI Support', exact: true }).waitFor()
    await page.getByRole('tab', { name: 'General Support', exact: true }).click()
    await page.getByRole('textbox', { name: 'Message AI support', exact: true }).fill('Local fallback check')
    await page.getByRole('button', { name: 'Send AI message', exact: true }).click()
    await page.getByText(/AI not configured/).waitFor({ timeout: 10000 })
    pass(`${role} ${path} loads and replies AI not configured`)
  }
}

async function main() {
  for (const name of ['OPENAI_API_KEY', 'RADAR_SECRET_KEY', 'RADAR_PUBLISHABLE_KEY', 'NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY']) {
    assert(!process.env[name]?.trim(), 'Run with optional provider keys empty')
  }
  const status = JSON.parse(execFileSync(resolveTool('supabase', 'SUPABASE_BIN'), ['status', '-o', 'json'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }))
  assert(localHost(status.API_URL), 'Supabase must be local')
  const portIndex = process.argv.indexOf('--port')
  const port = portIndex < 0 ? 3013 : Number(process.argv[portIndex + 1])
  assert(Number.isInteger(port) && port > 1024 && port < 65536, 'Invalid port')
  app = `http://127.0.0.1:${port}`
  const { chromium } = loadPlaywright()
  service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, options)

  stage = 'isolated empty-key production server'
  // Reject an occupied port before launching, so readiness never accepts an unrelated app.
  await new Promise((resolvePort, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(port, '127.0.0.1', () => probe.close(error => error ? reject(error) : resolvePort()))
  })
  server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: root, detached: true, stdio: 'ignore',
    env: {
      ...process.env, OPENAI_API_KEY: '', RADAR_SECRET_KEY: '', RADAR_PUBLISHABLE_KEY: '', NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY: '',
      NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL: app,
    },
  })
  let spawnFailed = false
  server.on('error', () => { spawnFailed = true })
  const deadline = Date.now() + 90000
  while (true) {
    assert(!spawnFailed && server.exitCode === null, 'Production server could not start; build first and choose an unused port')
    try { if ((await fetch(`${app}/auth/signin`, { signal: AbortSignal.timeout(1500) })).ok) break } catch { /* Wait for this server. */ }
    assert(Date.now() < deadline, 'Production server startup timed out')
    await delay(300)
  }

  stage = 'ephemeral account and ticket fixtures'
  const password = `${randomUUID()}aA1!`
  const accounts = {}
  for (const role of ['admin', 'customer']) {
    const email = `cyclops-r3-${role}-${randomUUID()}@example.test`
    const created = await service.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name: `Round 3 ${role}` },
      ...(role === 'admin' ? { app_metadata: { staff: true } } : {}),
    })
    assert(!created.error && created.data.user, 'Account fixture failed')
    const id = created.data.user.id
    users.push(id)
    accounts[role] = { id, email }
    if (role === 'admin') {
      assert(!(await service.from('agents').insert({ id, email, name: 'Round 3 admin', role: 'admin' })).error, 'Admin profile failed')
    } else {
      assert(!(await service.from('customers').upsert({ id, email, name: 'Round 3 customer' })).error, 'Customer profile failed')
    }
  }
  ticketId = randomUUID()
  const title = `Round 3 browser ticket ${ticketId.slice(0, 8)}`
  assert(!(await service.from('tickets').insert({
    id: ticketId, title, description: 'Round 3 initial browser description', customer_id: accounts.customer.id,
    status: 'open', priority: 'medium', type: 'question', source: 'web',
  })).error, 'Ticket fixture failed')

  stage = 'Chromium and two authenticated browser contexts'
  browser = await chromium.launch({ headless: !process.argv.includes('--headed') && process.env.HEADLESS !== 'false' })
  for (const role of ['admin', 'customer']) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: false })
    contexts.push(context)
    context.on('page', monitor)
    await context.route('**/*', route => {
      if (localHost(route.request().url())) return route.continue()
      faults.add('nonlocal browser request blocked')
      return route.abort('blockedbyclient')
    })
    const page = await context.newPage()
    page.setDefaultTimeout(30000)
    accounts[role].page = page
    await signIn(page, accounts[role].email, password)
  }
  const admin = accounts.admin.page
  const customer = accounts.customer.page
  await Promise.all([
    openTicket(admin, `/tickets/${ticketId}`, title),
    openTicket(customer, `/portal/tickets/${ticketId}`, title),
  ])
  stage = 'bidirectional browser realtime replies'
  await sendReply(admin, customer, 'Round 3 live admin reply')
  pass('admin reply reaches customer within 10 seconds without reload')
  await sendReply(customer, admin, 'Round 3 live customer reply')
  pass('customer reply reaches admin within 10 seconds without reload')

  stage = 'live customer status'
  const before = pageState.get(customer).navigations
  await admin.getByRole('button', { name: 'Change ticket status', exact: true }).click()
  await admin.getByRole('button', { name: 'in progress', exact: true }).click()
  const sentAt = Date.now()
  await admin.getByRole('dialog').getByRole('button', { name: 'Update status', exact: true }).click()
  await customer.getByText('In progress', { exact: true }).waitFor({ timeout: 10000 })
  assert(Date.now() - sentAt < 10000 && pageState.get(customer).navigations === before, 'Status was not live')
  pass('status reaches customer within 10 seconds with friendly label and no reload')

  stage = 'browser attachment persistence'
  await sendReply(admin, customer, 'Round 3 attached admin reply', 'round3-admin.png')
  await sendReply(customer, admin, 'Round 3 attached customer reply', 'round3-customer.png')
  await Promise.all([admin.reload(), customer.reload()])
  for (const page of [admin, customer]) {
    for (const name of ['round3-admin.png', 'round3-customer.png']) {
      await page.getByRole('button', { name: `${name} (1 KB)`, exact: true }).waitFor()
    }
  }
  await signedDownload(customer, 'round3-admin.png', status.API_URL)
  await signedDownload(admin, 'round3-customer.png', status.API_URL)
  pass('admin and customer PNG attachments survive reload and download via signed URLs')

  stage = 'mobile customer ticket'
  await customer.setViewportSize({ width: 390, height: 844 })
  assert(await customer.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Customer ticket overflows mobile viewport')
  assert(!(await customer.locator('body').innerText()).includes('in_progress'), 'Customer sees raw status')
  assert(!(await customer.locator('body').innerText()).includes('\nUser\n'), 'Customer sees generic User author')
  await customer.setViewportSize({ width: 1280, height: 900 })
  pass('customer ticket fits a 390px viewport and uses friendly status/author labels')

  stage = 'AI pages and no-key fallback'
  await checkAI(admin, 'admin')
  await checkAI(customer, 'customer')
  stage = 'overview creation dates'
  await admin.goto(`${app}/tickets/overview`)
  await admin.getByRole('row').filter({ hasText: title }).waitFor()
  assert(!/Invalid date/i.test(await admin.locator('body').innerText()), 'Overview date invalid')
  pass('overview contains the new ticket and no Invalid date')
  assert.equal(faults.size, 0, 'Browser reported exceptions, console errors, realtime failures, description warnings or nonlocal requests')
  pass('no page errors, console errors, realtime socket failures, or missing dialog descriptions')
}

async function cleanup() {
  stopping = true
  for (const context of contexts) await context.close().catch(() => {})
  await browser?.close().catch(() => {})
  if (server?.pid) {
    try { process.kill(-server.pid, 'SIGTERM') } catch { /* Already exited. */ }
    for (let i = 0; server.exitCode === null && server.signalCode === null && i < 50; i++) await delay(100)
    if (server.exitCode === null && server.signalCode === null) {
      try { process.kill(-server.pid, 'SIGKILL') } catch { /* Already exited. */ }
    }
  }
  if (!service) return
  let failed = false
  if (ticketId) {
    const paths = []
    const list = async prefix => {
      const result = await service.storage.from('ticket-attachments').list(prefix, { limit: 100 })
      if (result.error) { failed = true; return }
      for (const entry of result.data) {
        const path = `${prefix}/${entry.name}`
        if (entry.id) paths.push(path)
        else await list(path)
      }
    }
    await list(ticketId)
    if (paths.length) failed = !!(await service.storage.from('ticket-attachments').remove(paths)).error || failed
    for (const table of ['messages', 'status_history', 'ticket_history', 'sla_pauses', 'sla_states', 'sla_status', 'ticket_custom_fields', 'ticket_tags', 'ticket_followers', 'ticket_snapshots']) {
      failed = !!(await service.from(table).delete().eq('ticket_id', ticketId)).error || failed
    }
    failed = !!(await service.from('tickets').delete().eq('id', ticketId)).error || failed
  }
  for (const id of users.reverse()) {
    failed = !!(await service.from('agents').delete().eq('id', id)).error || failed
    failed = !!(await service.from('customers').delete().eq('id', id)).error || failed
    failed = !!(await service.auth.admin.deleteUser(id)).error || failed
  }
  await service.removeAllChannels()
  if (failed) { console.error('FAIL Round 3 fixture cleanup. Inspect local test fixtures.'); process.exitCode = 1 }
  else pass('temporary fixtures removed; browser and owned app server stopped; Supabase left running')
}

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  process.exitCode = 1
  void cleanup().catch(() => console.error('FAIL Round 3 interrupted fixture cleanup. Sensitive details suppressed.')).finally(() => process.exit(1))
})
main().catch(() => {
  console.error(`FAIL Round 3 at ${stage}. Sensitive details suppressed.`)
  if (faults.size) console.error(`Browser failure categories: ${[...faults].join(', ')}`)
  process.exitCode = 1
}).finally(async () => {
  try { await cleanup() }
  catch { console.error('FAIL Round 3 fixture cleanup. Sensitive details suppressed.'); process.exitCode = 1 }
})
