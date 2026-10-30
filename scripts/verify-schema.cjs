#!/usr/bin/env node
// Local-only inventory. No Supabase keys or env-file contents are read.
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['__tests__', '__mocks__', 'node_modules', '.next'].includes(entry.name)) return []
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(file) : /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [file] : []
  })
}
const refs = { from: new Map(), rpc: new Map() }
for (const file of [...filesUnder('src'), ...filesUnder('supabase/functions')]) {
  const source = fs.readFileSync(file, 'utf8')
  for (const [, kind, name] of source.matchAll(/\.(from|rpc)\(\s*['"]([^'"]+)['"]/g)) {
    if (!refs[kind].has(name)) refs[kind].set(name, [])
    refs[kind].get(name).push(file)
  }
}
const sql = `SELECT json_build_object(
  'relations',(SELECT json_agg(json_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'options',c.reloptions)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','v','m','p')),
  'functions',(SELECT json_agg(json_build_object('name',p.proname,'definer',p.prosecdef,'config',p.proconfig,'anon_execute',has_function_privilege('anon',p.oid,'execute'))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
  'private_anon_grants',(SELECT count(*) FROM information_schema.table_privileges WHERE grantee='anon' AND table_schema='public' AND table_name NOT IN ('articles','categories','knowledge_articles','knowledge_categories'))
);`
const result = spawnSync('docker', ['exec', '-i', 'supabase_db_zendesk-clone', 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' })
if (result.status !== 0) {
  console.error('FAIL: local Supabase catalog query failed. Start the zendesk-clone stack first.')
  process.exit(1)
}
const catalog = JSON.parse(result.stdout.trim())
const relations = new Map(catalog.relations.map(row => [row.name, row]))
const functions = new Set(catalog.functions.map(row => row.name))
let failed = false
function check(condition, message) {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${message}`)
  if (!condition) failed = true
}
for (const kind of ['from', 'rpc']) {
  const available = kind === 'from' ? relations : functions
  const missing = [...refs[kind].keys()].filter(name => !available.has(name))
  check(missing.length === 0, `${refs[kind].size} literal .${kind} references exist in the database${missing.length ? `; missing ${missing.join(', ')}` : ''}`)
  for (const name of missing) console.error(`  ${name}: ${refs[kind].get(name).join(', ')}`)
}
const tables = catalog.relations.filter(row => ['r', 'p'].includes(row.kind))
check(tables.every(row => row.rls), `${tables.filter(row => row.rls).length}/${tables.length} public tables have RLS enabled`)
const views = catalog.relations.filter(row => row.kind === 'v')
check(views.every(row => row.options?.includes('security_invoker=true')), `${views.length} compatibility views use security_invoker`)
const definers = catalog.functions.filter(row => row.definer)
check(definers.every(row => row.config?.some(option => /^search_path=public, pg_temp$/.test(option))), `${definers.length} SECURITY DEFINER functions pin search_path`)
check(!functions.has('execute_sql'), 'execute_sql has no remaining overloads')
check(catalog.private_anon_grants === 0, 'anon has no private-table or private-view grants')
check(definers.every(row => !row.anon_execute || row.name === 'is_staff'), 'anon can execute no data-changing SECURITY DEFINER RPC')
if (failed) process.exitCode = 1
