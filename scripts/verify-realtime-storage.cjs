#!/usr/bin/env node
// Local stack only. Credentials, random passwords and signed URLs stay in memory.
const { execFileSync, spawnSync } = require('node:child_process')
const { randomUUID } = require('node:crypto')
const { createClient } = require('@supabase/supabase-js')
const { requireTool } = require('./local-toolchain.cjs')
const supabaseBin = requireTool('supabase', 'SUPABASE_BIN')
const dockerBin = requireTool('docker', 'DOCKER_BIN')
const bucket = 'ticket-attachments'
const users = []
const tickets = []
const paths = []
const clients = []
const realtimeDiagnostics = []
let service
let stage = 'local catalog'
const check = (condition, message) => { if (!condition) throw new Error(message) }
const pass = message => console.log(`PASS ${message}`)
const waitFor = async (predicate, message) => {
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error(message)
}

async function main() {
  const sql = `SELECT json_build_object(
    'published',(SELECT json_agg(tablename) FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public'),
    'identity',(SELECT json_agg(json_build_object('name',relname,'identity',relreplident)) FROM pg_class WHERE oid IN ('public.messages'::regclass,'public.tickets'::regclass)),
    'bucket',(SELECT json_build_object('public',public,'limit',file_size_limit,'types',allowed_mime_types) FROM storage.buckets WHERE id='ticket-attachments'),
    'attachments',(SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='attachments')
  );`
  const query = spawnSync(dockerBin, ['exec', '-i', 'supabase_db_zendesk-clone', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' })
  check(query.status === 0, 'Catalog query failed; check Docker access and start the local stack')
  const catalog = JSON.parse(query.stdout.trim())
  check(['messages', 'tickets'].every(table => catalog.published?.includes(table)), 'Realtime publication missing messages or tickets')
  pass('supabase_realtime publishes public.messages and public.tickets')
  check(catalog.identity?.length === 2 && catalog.identity.every(row => row.identity === 'f'), 'Realtime tables need REPLICA IDENTITY FULL')
  pass('messages and tickets use REPLICA IDENTITY FULL')
  check(catalog.bucket?.public === false && catalog.bucket.limit > 0 && catalog.bucket.limit <= 10 * 1024 * 1024, 'Private bucket or size limit missing')
  check(catalog.attachments === 'jsonb', 'Message attachment metadata missing')
  check(catalog.bucket.types?.includes('image/png') && catalog.bucket.types.includes('text/plain') && !catalog.bucket.types.includes('text/html'), 'Bucket MIME allowlist missing')
  pass('ticket-attachments is private with size/MIME limits; messages store jsonb attachment metadata')

  stage = 'local status'
  const status = JSON.parse(execFileSync(supabaseBin, ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
  check(['localhost', '127.0.0.1'].includes(new URL(status.API_URL).hostname), 'Local stack only')
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  service = createClient(status.API_URL, status.SERVICE_ROLE_KEY, options)
  const password = randomUUID() + 'aA1!'
  const makeUser = async role => {
    const email = `cyclops-${role}-${randomUUID()}@example.test`
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true, ...(role === 'admin' ? { app_metadata: { staff: true } } : { user_metadata: { name: 'Realtime customer' } }) })
    check(!created.error && created.data.user, 'Fixture user creation failed')
    const id = created.data.user.id
    users.push(id)
    if (role === 'admin') {
      const agent = await service.from('agents').insert({ id, email, name: 'Realtime admin', role: 'admin' })
      check(!agent.error, 'Fixture admin profile failed')
    }
    const client = createClient(status.API_URL, status.ANON_KEY, options)
    clients.push(client)
    const login = await client.auth.signInWithPassword({ email, password })
    check(!login.error && login.data.session, 'Fixture login failed')
    await client.realtime.setAuth(login.data.session.access_token)
    return { id, client }
  }
  stage = 'fixture accounts and tickets'
  const admin = await makeUser('admin')
  const customer = await makeUser('customer')
  const other = await makeUser('customer')
  const makeTicket = async account => {
    const result = await account.client.from('tickets').insert({ title: 'Round 3 realtime/storage fixture', description: 'Local smoke only', customer_id: account.id, status: 'open', priority: 'medium' }).select('id').single()
    check(!result.error && result.data, 'Fixture ticket creation failed')
    tickets.push(result.data.id)
    return result.data.id
  }
  const ticket = await makeTicket(customer)
  const otherTicket = await makeTicket(other)
  const staffEvents = []
  const customerEvents = []
  const subscribe = async (account, events) => {
    let joined = false
    let postgresReady = false
    let onReady = () => {}
    const channel = account.client.channel(`round3-${account.id}-${randomUUID()}`)
      .on('system', {}, event => {
        realtimeDiagnostics.push({ account: account === admin ? 'admin' : 'customer', status: event.status, extension: event.extension, message: event.message })
        if (event.extension === 'postgres_changes' && event.status === 'ok') {
          postgresReady = true
          onReady()
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `ticket_id=eq.${ticket}` }, payload => events.push({ table: 'messages', row: payload.new }))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${ticket}` }, payload => events.push({ table: 'tickets', row: payload.new }))
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PostgreSQL subscription setup timed out')), 15000)
      onReady = () => { if (joined && postgresReady) { clearTimeout(timer); resolve() } }
      channel.subscribe(state => {
        realtimeDiagnostics.push({ account: account === admin ? 'admin' : 'customer', state })
        if (state === 'SUBSCRIBED') { joined = true; onReady() }
        else if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(state)) { clearTimeout(timer); reject(new Error('Subscription failed')) }
      })
    })
  }
  stage = 'authenticated realtime subscriptions'
  await Promise.all([subscribe(admin, staffEvents), subscribe(customer, customerEvents)])
  const send = async (account, content, internal = false, attachments = []) => {
    const result = await account.client.from('messages').insert({ ticket_id: ticket, content, author_id: account.id, author_type: account.id === admin.id ? 'agent' : 'customer', is_internal: internal, attachments }).select('id').single()
    check(!result.error && result.data, 'Message insert failed')
    return result.data.id
  }
  stage = 'staff to customer realtime reply'
  const staffReply = await send(admin, 'Staff realtime reply')
  await waitFor(() => customerEvents.some(event => event.row.id === staffReply), 'Customer did not receive staff reply within 10 seconds')
  pass('authenticated customer receives staff reply within 10 seconds without polling or reload')
  stage = 'customer to staff realtime reply'
  const customerReply = await send(customer, 'Customer realtime reply')
  await waitFor(() => staffEvents.some(event => event.row.id === customerReply), 'Staff did not receive customer reply within 10 seconds')
  pass('authenticated staff receives customer reply within 10 seconds without polling or reload')
  stage = 'live customer status'
  const update = await admin.client.from('tickets').update({ status: 'in_progress' }).eq('id', ticket)
  check(!update.error, 'Staff status update failed')
  await waitFor(() => customerEvents.some(event => event.table === 'tickets' && event.row.status === 'in_progress'), 'Customer did not receive status within 10 seconds')
  pass('customer receives ticket status change live within 10 seconds')
  stage = 'internal realtime isolation'
  const privateReply = await send(admin, 'Internal realtime note', true)
  await waitFor(() => staffEvents.some(event => event.row.id === privateReply), 'Staff did not receive internal note')
  const barrierReply = await send(admin, 'Public reply after internal note')
  await waitFor(() => customerEvents.some(event => event.row.id === barrierReply), 'Customer did not receive public barrier reply')
  check(!customerEvents.some(event => event.row.id === privateReply), 'Customer received internal note over realtime')
  pass('internal notes reach staff and are withheld from customer realtime')

  stage = 'storage uploads and attachment metadata'
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64')
  const upload = async (account, visibility, filename) => {
    const objectPath = `${ticket}/${visibility}/${randomUUID()}/${filename}`
    const result = await account.client.storage.from(bucket).upload(objectPath, png, { contentType: 'image/png' })
    check(!result.error, 'Upload failed')
    paths.push(objectPath)
    return objectPath
  }
  const staffPath = await upload(admin, 'public', 'staff.png')
  const customerPath = await upload(customer, 'public', 'customer.png')
  const internalPath = await upload(admin, 'internal', 'internal.png')
  const attached = await send(admin, 'Staff attachment', false, [{ name: 'staff.png', path: staffPath, type: 'image/png', size: png.length }])
  const customerAttached = await send(customer, 'Customer attachment', false, [{ name: 'customer.png', path: customerPath, type: 'image/png', size: png.length }])
  await send(admin, 'Internal attachment', true, [{ name: 'internal.png', path: internalPath, type: 'image/png', size: png.length }])
  const persisted = await customer.client.from('messages').select('id,attachments').in('id', [attached, customerAttached])
  check(!persisted.error && persisted.data?.length === 2 && persisted.data.every(row => row.attachments?.[0]?.size === png.length), 'Attachment metadata did not persist')
  pass('staff and customer PNG uploads persist with attachment metadata on messages')
  for (const account of [admin, customer]) {
    for (const objectPath of account === admin ? [staffPath, customerPath, internalPath] : [staffPath, customerPath]) {
      const signed = await account.client.storage.from(bucket).createSignedUrl(objectPath, 60, { download: objectPath.split('/').pop() })
      check(!signed.error && signed.data?.signedUrl, 'Signed download denied')
      const download = await fetch(signed.data.signedUrl)
      check(/^attachment;/i.test(download.headers.get('content-disposition') || ''), 'Download must use attachment disposition')
      check(download.ok && (await download.arrayBuffer()).byteLength === png.length, 'Signed PNG download failed')
    }
  }
  pass('staff downloads all attachments; owning customer downloads public attachments via signed URLs')
  stage = 'attachment MIME and metadata rejection'
  for (const mime of ['text/html', 'image/svg+xml', 'application/javascript', 'application/x-msdownload', 'text/xml']) {
    const objectPath = `${ticket}/public/${randomUUID()}/blocked.html`
    const denied = await customer.client.storage.from(bucket).upload(objectPath, Buffer.from('blocked'), { contentType: mime })
    if (!denied.error) paths.push(objectPath)
    check(!!denied.error && /mime|type.*not.*supported|not.*allowed/i.test(denied.error.message), 'Bucket accepted a forbidden MIME type')
  }
  for (const name of ['bad.html', 'bad.htm', 'bad.svg', 'bad.js', 'bad.mjs', 'bad.exe', 'bad.sh', 'bad.bat', 'bad.msi', 'bad.xml', 'bad.xhtml', 'bad.png.html', 'bad.unknown']) {
    // Spoof a harmless MIME as well: metadata must check names independently.
    const result = await customer.client.from('messages').insert({ ticket_id: ticket, content: 'Rejected attachment probe', author_id: customer.id, author_type: 'customer', attachments: [{ name, type: 'image/png', path: staffPath, size: png.length }] })
    check(!!result.error && /attachment metadata/i.test(result.error.message), 'Metadata accepted a forbidden filename')
  }
  for (const attachment of [
    { name: 'safe.png', type: 'text/html', path: staffPath, size: png.length },
    { name: 'safe.png', type: 'text/plain', path: staffPath, size: png.length },
    { name: 'safe.png', type: 'image/png', path: `${ticket}/public/bad.exe`, size: png.length },
  ]) {
    const result = await customer.client.from('messages').insert({ ticket_id: ticket, content: 'Rejected MIME/path probe', author_id: customer.id, author_type: 'customer', attachments: [attachment] })
    check(!!result.error && /attachment metadata/i.test(result.error.message), 'Metadata accepted a mismatched MIME/path')
  }
  pass('bucket rejects forbidden MIME types; metadata rejects forbidden names, mismatches and disguised paths')
  stage = 'storage isolation'
  const anon = createClient(status.API_URL, status.ANON_KEY, options)
  clients.push(anon)
  for (const [client, objectPath] of [[other.client, staffPath], [customer.client, internalPath], [anon, staffPath]]) {
    const denied = await client.storage.from(bucket).createSignedUrl(objectPath, 60, { download: objectPath.split('/').pop() })
    check(!!denied.error && !denied.data?.signedUrl, 'Unauthorized signed download allowed')
  }
  for (const [client, objectPath] of [
    [customer.client, `${otherTicket}/public/${randomUUID()}/forbidden.png`],
    [customer.client, `${ticket}/internal/${randomUUID()}/forbidden.png`],
    [anon, `${ticket}/public/${randomUUID()}/forbidden.png`],
  ]) {
    const denied = await client.storage.from(bucket).upload(objectPath, png, { contentType: 'image/png' })
    if (!denied.error) paths.push(objectPath)
    check(!!denied.error, 'Unauthorized upload allowed')
  }
  pass('cross-customer, anonymous and customer internal-file reads/uploads are denied')
  if (process.env.VERIFY_REALTIME_DEBUG === '1') console.log(JSON.stringify(realtimeDiagnostics))
}

main().catch(() => {
  if (process.env.VERIFY_REALTIME_DEBUG === '1') console.error(JSON.stringify(realtimeDiagnostics))
  console.error(`FAIL realtime/storage smoke at ${stage}. Check local stack/tool access and migrations. Sensitive details suppressed.`)
  process.exitCode = 1
}).finally(async () => {
  for (const client of clients) {
    await client.removeAllChannels()
    await client.auth.signOut()
  }
  if (!service) return
  let failed = false
  if (paths.length) failed = !!(await service.storage.from(bucket).remove(paths)).error || failed
  for (const id of tickets) {
    for (const table of ['messages', 'status_history', 'ticket_history', 'sla_pauses', 'sla_states', 'sla_status', 'ticket_custom_fields', 'ticket_tags', 'ticket_followers', 'ticket_snapshots']) {
      failed = !!(await service.from(table).delete().eq('ticket_id', id)).error || failed
    }
    failed = !!(await service.from('tickets').delete().eq('id', id)).error || failed
  }
  for (const id of users.reverse()) {
    failed = !!(await service.from('agents').delete().eq('id', id)).error || failed
    failed = !!(await service.from('customers').delete().eq('id', id)).error || failed
    failed = !!(await service.auth.admin.deleteUser(id)).error || failed
  }
  if (failed) { console.error('FAIL realtime/storage fixture cleanup. Inspect local smoke fixtures.'); process.exitCode = 1 }
  else pass('temporary realtime/storage fixtures removed')
})
