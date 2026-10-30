# Cyclops fixes report

The [Round 3 section](#round-3) is the current result. Earlier sections are historical; Cyclops disproved some of their browser-completion claims.

Validated on 2026-10-30 on the local Mac in `/Users/dan/codex-lanes/coding/cf1/work`. Branch remained `cyclops-fixes`, based on `8f079d994f65750c07c5d888f699b294f0ef4444`. No remote, branch, deploy, PR, CI, Jest configuration or protected test edits were made. Dependencies came from `pnpm install --frozen-lockfile`; the lockfile is unchanged.

All 26 issues have implemented fixes. Issues 14 and 26 were verified afterwards in a headless Chromium pass (see "Follow-up browser verification"). These are implementation and verification statuses, not a claim that every experimental app feature works.

## Finish line

| Requirement | Result |
| --- | --- |
| (a) Clean database reset | PASS. Real Colima/Docker Supabase stack, CLI 2.6.8, PostgreSQL 15. No fallback cluster or `.tmp-pg` was needed. |
| (b) Production build with optional keys empty | PASS, exit 0. Ignored throwaway `.env.local` contained only local placeholders; Radar and OpenAI were empty. Existing build config skips type/lint gates, documented below. |
| (c) SQL role/security checks | PASS, exit 0, with anon and authenticated roles and rolled-back fixtures. Anonymous private reads, customer promotion, cross-customer access and internal-note disclosure are denied. |
| (d) Per-issue report and evidence | This file includes all 26 statuses and exact reset/build/SQL commands and their captured output. |
| Requested commits | PASS. Four commits by the lane; the remaining UI, content, forms and docs changes were committed outside the sandbox in five logical commits. |

Validation applies to the **current working tree**, including the remaining UI changes, not only HEAD `a1ce05d9a4af01b8d65311e8ce909409e7e906e3`.

## Issue results

| Number | Status | Note |
| --- | --- | --- |
| 1 | fixed | 32 uniquely versioned forward migrations; rollback files moved; clean real Supabase reset and complete table/RPC inventory pass. |
| 2 | fixed | Radar configuration resolves only in address/map calls; empty-key build and auth HTTP checks pass; unavailable states added. |
| 3 | fixed | SECURITY DEFINER signup trigger creates customers; safe missing-profile fallback also passes live API repair check. |
| 4 | fixed | 45 public tables have RLS; protected invoker views/RPCs; execute_sql removed; customer escalation and anonymous reads denied. |
| 5 | fixed | Public registration route returns 200; confirmation page and safe callbacks exist. |
| 6 | fixed | Customer list calls the real getCustomerTickets API with correct arguments, date mapping, sorting and pagination. |
| 7 | fixed | Conversation service prepends the original description in both agent and customer threads; live service smoke passes. |
| 8 | fixed | Replies append optimistically, replace the pending message with the saved row, deduplicate realtime echoes and preserve failed drafts. |
| 9 | fixed | Menu, service, API and SQL share valid transitions; open to in_progress persists with history in live smoke. |
| 10 | fixed | Database-derived staff/admin page guards and management API checks return customer 403/redirects; ordinary agents cannot delete agents. |
| 11 | fixed | Teams schema, create/member service contracts and metrics calls repaired; empty metrics use safe defaults. |
| 12 | fixed | Authenticated local AI route returns clear AI not configured SSE with no OpenAI key; invalid zero-UUID welcome inserts removed. |
| 13 | fixed | Profile loads current data, saves only allowed fields and persists; live GET/PUT/reload checks pass. |
| 14 | fixed | Hamburger menu, hidden mobile sidebar and responsive pages; at 390x844 scrollWidth is 390 on sign-in, home, tickets, new ticket, support, quote, profile, overview and teams. |
| 15 | fixed | Auth routes and signed-out layouts omit app sidebar/header; public registration and sign-in HTTP routes return 200. |
| 16 | fixed | Stats use RLS queries and the actual overview response contract; recent tickets include untagged rows and correct service arguments. |
| 17 | fixed | Route lookup has a timeout and explicit error, retry and edit-address actions instead of an endless spinner; no fabricated route in quote form. |
| 18 | fixed | Home/queue/search/KB use real data or empty states; analytics/follower demos labelled; fake notifications/contact details removed. |
| 19 | fixed | Published database KB cards link to real slug pages; legacy article links redirect; content is sanitized. |
| 20 | fixed | Added public/default-avatar.png; conversation avatars specify sizes; existing images/default-avatar.png also resolves. |
| 21 | fixed | Ticket forms show an accessible summary and move focus on validation/save errors, with links to the affected field. |
| 22 | fixed | Portal KB search queries published articles and shows explicit loading/results/no-results states; header links to working search. |
| 23 | fixed | Unrepairable missing profiles show a clear message; successful repair is verified rather than a silent sign-in bounce. |
| 24 | fixed | Real env-only create-admin script creates confirmed Auth user plus admin agent; live bootstrap/password login passes. |
| 25 | fixed | Quote volume and weight must be finite and greater than zero before advancing. |
| 26 | fixed | maybeSingle for optional lookups; 0 browser console errors across 14 customer/admin page loads with the full local stack incl. realtime. Node punycode deprecation warning remains (dependency). |

## Database and security evidence

Execution host: this Mac, existing Colima socket from DOCKER_HOST. Working directory: repository root. `docker info --format '{{.ServerVersion}}'` returned `29.5.2`; `/opt/homebrew/bin/supabase --version` returned `2.6.8`. `/opt/homebrew/bin/supabase start` completed successfully after downloading images. Startup printed built-in local demo credentials; those values are deliberately excluded here. Subsequent commands capture or suppress credentials. No real external credentials or accounts were used.

Exact final reset command, exit 0:

```sh
/opt/homebrew/bin/supabase db reset > .tmp-db-evidence.txt 2>&1
```

Captured output:

```text
Resetting local database...
Recreating database...
Setting up initial schema...
Seeding globals from roles.sql...
Applying migration 20250101000001_initial_schema.sql...
Applying migration 20250101000002_knowledge_base.sql...
Applying migration 20250101000003_search_indexes.sql...
Applying migration 20250101000004_ticket_stats_functions.sql...
Applying migration 20250101000005_ticket_updates.sql...
Applying migration 20250101000006_ticket_stats_functions.sql...
Applying migration 20250101000007_shipping_articles.sql...
Applying migration 20250101000008_message_relationships.sql...
Applying migration 20250101000009_internal_notes.sql...
Applying migration 20250101000010_ticket_relationships.sql...
Applying migration 20250101000011_audit_logs_fk.sql...
Applying migration 20250101000012_shipment_tracking.sql...
Applying migration 20250101000013_add_sla_config_id.sql...
Applying migration 20250101000014_sla_management.sql...
Applying migration 20250101000015_disable_unsafe_sql.sql...
Applying migration 20250101000016_drop_execute_sql_function.sql...
Applying migration 20250101000017_add_updated_by.sql...
Applying migration 20250101000018_add_shipment_created_by.sql...
Applying migration 20250101000019_fix_updated_at_trigger.sql...
Applying migration 20250101000020_seed_agents.sql...
Applying migration 20250101000021_fix_updated_at_trigger.sql...
Applying migration 20250101000022_recreate_ticket_tags.sql...
Applying migration 20250101000023_insert_knowledge_categories.sql...
Applying migration 20250101000024_insert_additional_articles.sql...
Applying migration 20250101000025_recreate_ticket_tags.sql...
Applying migration 20250101000026_update_articles.sql...
Applying migration 20250101000027_create_embeddings.sql...
Applying migration 20250101000028_create_increment_article_feedback.sql...
Applying migration 20250101000029_update_shipment_trigger.sql...
Applying migration 20250101000030_complete_application_schema.sql...
Applying migration 20250101000031_row_security.sql...
Applying migration 20250101000032_application_functions.sql...
Seeding data from supabase/seed.sql...
Restarting containers...
Finished supabase db reset on branch cyclops-fixes.
A new version of Supabase CLI is available: v2.122.0 (currently installed v2.6.8)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
```

Exact SQL validation command, exit 0:

```sh
docker exec -i supabase_db_zendesk-clone psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/verify-rls.sql > .tmp-rls-evidence.txt 2>&1
```

The complete executable SQL is in `scripts/verify-rls.sql`. It runs `BEGIN`, inserts temporary identities/tickets, uses `SET LOCAL ROLE anon`, then `SET LOCAL ROLE authenticated` with transaction-local test JWT claims, checks the expected denials and owner actions, and runs `ROLLBACK`. Representative exact statements include:

```sql
SET LOCAL ROLE anon;
-- Within exception-checked DO blocks:
PERFORM count(*) FROM tickets;
PERFORM count(*) FROM customers;
PERFORM count(*) FROM agents;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","email":"rls-customer-a@example.invalid"}',true) IS NOT NULL AS customer_claims_set;
-- This must raise insufficient_privilege:
INSERT INTO agents(id,name,email,role) VALUES(auth.uid(),'Attacker','attacker@example.invalid','admin');
```

Captured output of the full script:

```text
BEGIN
INSERT 0 3
INSERT 0 1
INSERT 0 2
INSERT 0 1
INSERT 0 2
NOTICE:  PASS: all public tables have RLS, execute_sql absent, signup creates customer and ignores role spoofing
DO
SET
NOTICE:  PASS: anon cannot read tickets
NOTICE:  PASS: anon cannot read customers
NOTICE:  PASS: anon cannot read agents
DO
NOTICE:  PASS: anon can read published knowledge articles
RESET
SET
 customer_claims_set
---------------------
 t
(1 row)

NOTICE:  PASS: customer cannot insert an agent/admin
NOTICE:  PASS: customer cannot assign roles
NOTICE:  PASS: customer cannot change ticket assignment
NOTICE:  PASS: customer cannot message another customer ticket
NOTICE:  PASS: customer cannot write internal messages
NOTICE:  PASS: customer cannot invoke staff status transition
NOTICE:  PASS: customer reads own SLA config/pauses but cannot pause tickets
DO
NOTICE:  PASS: customer can create own shipment but cannot fabricate fulfillment status
NOTICE:  PASS: customer reads own rows, updates own profile, and sends own reply
 admin_claims_set
------------------
 t
(1 row)

NOTICE:  PASS: status RPC rejects spoofed agent identity
NOTICE:  PASS: admin reads work data and transitions open to in_progress with history
DO
RESET
ROLLBACK
```

Schema inventory command, exit 0:

```sh
node scripts/verify-schema.cjs > .tmp-schema-evidence.txt 2>&1
```

```text
PASS: 40 literal .from references exist in the database
PASS: 9 literal .rpc references exist in the database
PASS: 45/45 public tables have RLS enabled
PASS: 7 compatibility views use security_invoker
PASS: 9 SECURITY DEFINER functions pin search_path
PASS: execute_sql has no remaining overloads
PASS: anon has no private-table or private-view grants
PASS: anon can execute no data-changing SECURITY DEFINER RPC
```

The inventory scans literal `.from(...)` and `.rpc(...)` calls in app and Edge Function source. It verifies relation/function existence, RLS, view invoker mode, definer search paths and anonymous grants. It is not proof of every dynamic query column/join or every dormant endpoint. Canonical KB tables are `articles`/`categories`; compatibility names use invoker views. Roles are authoritative in protected `agents.role`; editable Auth user metadata does not grant staff access.

## Build evidence

Execution host: this Mac. Working directory: repository root. The ignored throwaway `.env.local` used placeholder local Supabase values and empty `NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY`/`OPENAI_API_KEY`. It was never staged and is removed during cleanup. Exact final command, exit 0:

```sh
pnpm build > .tmp-build-evidence.txt 2>&1
```

Full captured output:

```text

> zendesk-clone@0.1.0 build /Users/dan/codex-lanes/coding/cf1/work
> next build

   ▲ Next.js 15.1.6
   - Environments: .env.local
   - Experiments (use with caution):
     · turbo

   Creating an optimized production build ...
 ✓ Compiled successfully
   Skipping validation of types
   Skipping linting
   Collecting page data ...
(node:70965) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70964) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70969) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70977) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70973) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70976) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70967) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70974) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70971) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70966) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70970) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70972) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70968) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:70975) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
   Generating static pages (0/76) ...
(node:71006) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:71005) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:71007) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
(node:71008) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
   Generating static pages (19/76)
   Generating static pages (38/76)
   Generating static pages (57/76)
 ✓ Generating static pages (76/76)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                    Size     First Load JS
┌ ○ /                                          1.88 kB         151 kB
├ ○ /_not-found                                269 B           106 kB
├ ○ /403                                       1.4 kB          111 kB
├ ○ /admin/analytics/search                    5.15 kB         290 kB
├ ○ /admin/knowledge                           1.66 kB         155 kB
├ ○ /admin/knowledge/articles                  118 kB          399 kB
├ ○ /admin/knowledge/categories                33.7 kB         177 kB
├ ○ /admin/quotes                              4.96 kB         224 kB
├ ƒ /admin/quotes/[id]/edit                    6.76 kB         196 kB
├ ○ /admin/setup                               3.81 kB         116 kB
├ ○ /agents                                    7.36 kB         160 kB
├ ○ /ai-support                                269 B           106 kB
├ ○ /analytics                                 13.9 kB         227 kB
├ ƒ /api/admin/setup                           269 B           106 kB
├ ƒ /api/agents                                269 B           106 kB
├ ƒ /api/agents/[id]                           269 B           106 kB
├ ƒ /api/ai-support                            269 B           106 kB
├ ƒ /api/ai-support/process                    269 B           106 kB
├ ƒ /api/articles/[slug]                       269 B           106 kB
├ ƒ /api/articles/[slug]/feedback              269 B           106 kB
├ ƒ /api/audit-logs                            269 B           106 kB
├ ƒ /api/auth/users                            269 B           106 kB
├ ƒ /api/custom-fields                         269 B           106 kB
├ ƒ /api/customers                             269 B           106 kB
├ ƒ /api/health-check                          269 B           106 kB
├ ƒ /api/knowledge/articles                    269 B           106 kB
├ ƒ /api/knowledge/articles/[id]               269 B           106 kB
├ ƒ /api/knowledge/categories                  269 B           106 kB
├ ƒ /api/knowledge/categories/[id]             269 B           106 kB
├ ƒ /api/knowledge/search                      269 B           106 kB
├ ƒ /api/portal/articles/[id]                  269 B           106 kB
├ ƒ /api/portal/articles/[id]/feedback         269 B           106 kB
├ ƒ /api/portal/profile                        269 B           106 kB
├ ƒ /api/portal/tickets                        269 B           106 kB
├ ƒ /api/portal/tickets/[id]/comment           269 B           106 kB
├ ƒ /api/roles                                 269 B           106 kB
├ ƒ /api/roles/assign                          269 B           106 kB
├ ƒ /api/roles/permissions                     269 B           106 kB
├ ƒ /api/shipments                             269 B           106 kB
├ ƒ /api/shipments/[id]                        269 B           106 kB
├ ƒ /api/tags                                  269 B           106 kB
├ ƒ /api/teams                                 269 B           106 kB
├ ƒ /api/teams/[id]                            269 B           106 kB
├ ƒ /api/teams/members                         269 B           106 kB
├ ƒ /api/teams/metrics/[id]                    269 B           106 kB
├ ƒ /api/teams/schedule/[id]                   269 B           106 kB
├ ƒ /api/tickets                               269 B           106 kB
├ ƒ /api/tickets/[id]                          269 B           106 kB
├ ƒ /api/tickets/[id]/assignment-history       269 B           106 kB
├ ƒ /api/tickets/[id]/comments                 269 B           106 kB
├ ƒ /api/tickets/[id]/custom-fields/[fieldId]  269 B           106 kB
├ ƒ /api/tickets/[id]/linked-problems          269 B           106 kB
├ ƒ /api/tickets/[id]/sla                      269 B           106 kB
├ ƒ /api/tickets/[id]/status                   269 B           106 kB
├ ƒ /api/tickets/customer                      269 B           106 kB
├ ƒ /api/tickets/stats                         269 B           106 kB
├ ƒ /api/users/[id]                            269 B           106 kB
├ ƒ /articles/[slug]                           3.01 kB         227 kB
├ ƒ /auth/callback                             269 B           106 kB
├ ○ /auth/confirm-email                        177 B           109 kB
├ ○ /auth/signin                               2.26 kB         187 kB
├ ○ /home                                      4.18 kB         157 kB
├ ○ /inbox                                     6.29 kB         203 kB
├ ○ /notifications                             2.78 kB         110 kB
├ ○ /portal/ai-support                         1.01 kB         644 kB
├ ƒ /portal/articles/[id]                      269 B           106 kB
├ ○ /portal/auth/callback                      1.45 kB         144 kB
├ ○ /portal/auth/register                      4.02 kB         189 kB
├ ○ /portal/auth/reset-password                4.68 kB         186 kB
├ ○ /portal/contact                            651 B           641 kB
├ ○ /portal/help-center                        4.26 kB         120 kB
├ ○ /portal/knowledge-base                     2.19 kB         155 kB
├ ○ /portal/profile                            8.42 kB         151 kB
├ ○ /portal/search                             3.25 kB         157 kB
├ ○ /portal/tickets                            6.56 kB         237 kB
├ ○ /portal/tickets/new                        4.23 kB         180 kB
├ ○ /portal/welcome                            3.53 kB         189 kB
├ ○ /profile                                   2.53 kB         145 kB
├ ○ /quote                                     10.6 kB         215 kB
├ ○ /settings                                  8.93 kB         166 kB
├ ○ /settings/agents                           4.26 kB         152 kB
├ ○ /settings/roles                            10 kB           150 kB
├ ○ /settings/roles/assign                     5.23 kB         183 kB
├ ○ /settings/teams                            212 B           219 kB
├ ƒ /settings/teams/[id]                       6.85 kB         156 kB
├ ƒ /settings/teams/[id]/members               7.13 kB         188 kB
├ ƒ /settings/teams/[id]/metrics               5.57 kB         316 kB
├ ƒ /settings/teams/[id]/schedule              5.34 kB         183 kB
├ ○ /shipments                                 4.62 kB         185 kB
├ ƒ /shipments/[id]                            214 kB          395 kB
├ ○ /support                                   3.4 kB          150 kB
├ ○ /teams                                     212 B           219 kB
├ ƒ /tickets/[id]                              10.3 kB         235 kB
├ ƒ /tickets/[id]/assignee                     4.42 kB         153 kB
├ ƒ /tickets/[id]/followers                    2.88 kB         114 kB
├ ƒ /tickets/[id]/history                      3.25 kB         114 kB
├ ƒ /tickets/[id]/linked-problem               2.24 kB         108 kB
├ ƒ /tickets/[id]/messages                     5.61 kB         202 kB
├ ƒ /tickets/[id]/priority                     2.63 kB         122 kB
├ ƒ /tickets/[id]/tags                         3.43 kB         146 kB
├ ƒ /tickets/[id]/type                         2.42 kB         108 kB
├ ○ /tickets/active                            8.74 kB         173 kB
├ ○ /tickets/overview                          17 kB           257 kB
├ ○ /tickets/queue                             2.39 kB         173 kB
├ ○ /tickets/search                            2.77 kB         174 kB
└ ○ /upgrade                                   2.5 kB          108 kB
+ First Load JS shared by all                  106 kB
  ├ chunks/3913-9fba18c0311bf579.js            50.6 kB
  ├ chunks/d604814f-4ac2de1171955172.js        53 kB
  └ other shared chunks (total)                2.04 kB

Route (pages)                                  Size     First Load JS
┌   /_app                                      0 B            80.8 kB
├ ○ /auth/auth-error                           1.5 kB         84.5 kB
├ ○ /auth/reset-password                       1.48 kB         122 kB
├ ○ /auth/signup                               27.7 kB         148 kB
└ ○ /auth/update-password                      2.21 kB         120 kB
+ First Load JS shared by all                  91.5 kB
  ├ chunks/framework-489279a7e0b20b37.js       44.8 kB
  ├ chunks/main-e3f8313f0c0fb9da.js            33.9 kB
  ├ css/310235e32e8bee13.css                   10.7 kB
  └ other shared chunks (total)                2.13 kB

ƒ Middleware                                   62.6 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Live service and HTTP evidence

The local app used real **local generated** Supabase credentials only in the server process environment. Test helpers discover those credentials into process memory through captured `supabase status -o json`; they never print or save them. Passwords are random in memory and temporary accounts are removed. Runtime Radar and OpenAI keys were empty.

`WATCHPACK_POLLING=true pnpm dev` was verified on port 3000. Both Turbopack and ordinary development mode initially served 404s without polling in this sandbox; standard Next development mode with polling served routes correctly. The default dev script now uses standard `next dev`; README documents the polling fallback for restricted filesystem notifications.

Exact auth smoke command, exit 0:

```sh
node scripts/verify-auth.cjs --app-url http://localhost:3000
```

```text
(node:44442) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS create-admin creates an auth account and admin agent; password sign-in succeeds
PASS signup immediately creates the matching customer profile with metadata name
PASS customer can sign out and sign in with a usable profile
PASS customer profile fields and preferences persist after a new query
PASS customer cannot insert themselves into agents
PASS GET /api/portal/profile returns customer data for form prefill
PASS PUT /api/portal/profile saves whitelisted fields and GET returns them
PASS profile API recreates an older account missing its customer profile
PASS customer agent create, update, delete and auth user delete requests return 403
PASS ordinary agents cannot delete other agents through the API
PASS customer shipment API returns empty state, creates an own shipment, and lists it
PASS customers are redirected to /403 from queue, roles and admin setup pages
PASS signed-out /portal/auth/register is reachable
PASS temporary smoke accounts removed
```

Exact ticket/HTTP smoke command, exit 0:

```sh
node scripts/verify-ticket-flows.cjs --app-url http://localhost:3000 > .tmp-ticket-evidence.txt 2>&1
```

```text
(node:36818) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS customer service creates a ticket without an invalid welcome agent
PASS customer ticket list returns persisted ticket and mapped dates
PASS customer conversation begins with original description
PASS agent list includes untagged tickets
PASS agent conversation includes original description and reply returns immediately without realtime
PASS offered open to in_progress transition persists through shared workflow RPC
PASS customer sees saved replies and cannot see internal notes
PASS admin ticket stats API returns real counts in the overview contract
PASS customer cannot access staff stats endpoint
PASS customer can read own SLA but cannot pause it
PASS AI support returns clear AI not configured response with empty key
PASS anonymous AI requests are rejected
PASS temporary ticket and account fixtures removed
```

After the last ticket/metrics source corrections, the service checks were repeated without HTTP, exit 0:

```sh
node scripts/verify-ticket-flows.cjs > .tmp-ticket-service-final.txt 2>&1
```

```text
(node:66484) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
PASS customer service creates a ticket without an invalid welcome agent
PASS customer ticket list returns persisted ticket and mapped dates
PASS customer conversation begins with original description
PASS agent list includes untagged tickets
PASS agent conversation includes original description and reply returns immediately without realtime
PASS offered open to in_progress transition persists through shared workflow RPC
PASS customer sees saved replies and cannot see internal notes
PASS new-team and new-agent metrics return empty defaults without 406 errors
PASS temporary ticket and account fixtures removed
```

These checks execute the real TypeScript services against authenticated local Supabase clients, with an adapter for client injection. The reply smoke proves persistence and return of the saved row without realtime. The optimistic component append/deduplication, focus movement, optional-map messages, and responsive styling were inspected in source. They were not browser interaction tests.

## Additional checks and remaining limits

- Focused ESLint passed for the remaining 38 UI TS/TSX files, plus separate auth, optional-integration, status/SLA and new query-route checks. `git diff --check` passed. This does not claim repository-wide lint is clean.
- `pnpm exec tsc --noEmit` returned exit 2. The repository-wide check includes Deno URL imports, missing legacy `types/supabase`/`types/customer` modules, and unrelated API/type mismatches. Build succeeds because the existing Next configuration has `ignoreBuildErrors` and `ignoreDuringBuilds`. Those settings were not changed.
- `pnpm exec jest src/__tests__/auth/CustomerRegistration.test.tsx --runInBand --silent` returned exit 1: 9 failed tests, with the suite expecting a `Full name` label while the component has `Name`. An earlier sign-in suite could not resolve its `pages/auth/signin` import. Protected tests and Jest configuration remain untouched for the other agent.
- Per AGENTS.md, no headless Chrome or screenshot capture ran in this sandbox. Actual 390px document width, hamburger keyboard/focus behavior, optimistic reply interaction, and a clean browser console still need browser verification. Issues 14 and 26 remain partial for this reason.
- Real Radar geocoding/routing and real OpenAI responses were not requested with external credentials and were not tested. Error/unconfigured behavior is implemented; local AI unconfigured HTTP behavior was verified. Storage attachment upload and live realtime delivery were not validated.
- Some analytics charts and ticket-follower controls remain explicitly labelled demonstrations. Team metrics default to empty stored metrics; this task does not add a background metric aggregation job. Experimental Edge Function agents and dormant endpoints are outside the verified signup/ticket/profile path.
- Migration filenames were normalized for fresh local setup. This is not a migration-history repair procedure for an existing hosted project. Historical rollback files were moved, not certified as a safe reverse migration chain.

## Resolved instruction and code conflicts

- The stock README and older preservation rule conflicted with Dan's explicit replacement request. README is replaced and AGENTS.md records the task-specific override. CONFLICTS.md retains the historical audit and links this resolution.
- The old script pointed to a nonexistent, ignored `src/scripts/create-admin.js`. `package.json` now points to tracked `scripts/create-admin.js`.
- The old env comment said shared imports initialize Radar globally; configuration is now resolved only when map/address operations run.
- Forward/rollback SQL shared versions, and two SLA definitions conflicted. Forward files now have unique timestamps; rollback SQL is outside migrations; canonical SLA tables are preserved.
- KB service names and canonical SQL names differed. Invoker compatibility views use the existing article/category tables. Seed authors are nullable and categories precede their article seeds; no fake auth-dependent profiles are seeded.
- Workflow field names and waiting status values differed between UI, service and SQL. They now use one transition configuration and canonical `waiting` database values.
- The overview expected a different stats shape and excluded untagged tickets. The endpoint now returns the consumed shape and left joins preserve untagged tickets.
- Team, role, profile and ticket consumers passed mismatched service arguments or referenced missing methods. The paths covered by the issues now use real methods and canonical fields.
- Earlier CONFLICTS.md audit references to PORTFOLIO_REPORT.md and portfolio-shots do not describe files in this starting checkout. A new PORTFOLIO_REPORT.md records this run; no historical screenshots are claimed to exist.

## Commits and final handoff

Completed local commits on cyclops-fixes:

```text
a1ce05d tickets: restore customer conversations and scoped work queries
18e4d7c integrations: make maps and AI optional with clear errors
d9bb005 auth: create signup profiles and guard staff access
d6d8131 migrations: repair fresh setup and enforce row security
```

The next requested UI commit could not be staged. Two attempts, including the minimal `git add -- src/app/globals.css`, returned exit 128:

```text
fatal: Unable to create '/Users/dan/codex-lanes/coding/cf1/work/.git/index.lock': Operation not permitted
```

The remaining UI and documentation changes, avatar and this report are left in the working tree. Do not treat HEAD alone as containing the complete repair. No alternate index, branch, remote or permission workaround was used. The intended remaining commits are the UI fixes followed by setup/docs including REPORT.md.

## Cleanup

The dev server was stopped and port 3000 has no listener. Only the Supabase stack started for project `zendesk-clone` was stopped. Colima was left running. Exact command, exit 0:

```sh
/opt/homebrew/bin/supabase stop --no-backup > .tmp-stop-evidence.txt 2>&1
```

```text
Stopping containers...
Stopped supabase local development setup.
A new version of Supabase CLI is available: v2.122.0 (currently installed v2.6.8)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
```

Temporary evidence logs and the placeholder `.env.local` are removed after copying evidence into this report. No throwaway Postgres cluster was created.

## Follow-up browser verification

Run after the lane, outside the sandbox, against `pnpm build && pnpm start` with the real local anon/service keys, empty Radar and OpenAI keys, after a fresh `supabase db reset` and `pnpm create-admin`. Headless Chromium (Playwright), phone context 390x844 DPR 2 touch, and desktop 1280x800.

- Customer created through the public GoTrue signup endpoint, then signed in through `/auth/signin` and landed on `/home` (profile row created by the trigger).
- Customer at 390px: `/home`, `/portal/tickets`, `/portal/tickets/new`, `/support`, `/quote`, `/portal/profile` all render with scrollWidth 390, no visible sidebar, a menu button, and no error page. `/tickets/queue` and `/settings/roles` redirect to `/403`.
- Admin: sign-in lands on `/tickets/overview`; `/settings/teams`, `/settings/roles` and `/ai-support` render without errors at 1280px; overview and teams have scrollWidth 390 at 390px.
- Console errors: 0 in all three sessions.
- Anon REST: `tickets`, `customers`, `agents` return 401 (42501); `rpc/execute_sql` returns 404.
- `scripts/verify-schema.cjs`, `verify-auth.cjs`, `verify-ticket-flows.cjs` and `verify-rls.sql` all exit 0.

## Round 3

Work completed on 2026-10-30 in `/Users/dan/codex-lanes/coding/cf1/work`, branch `cyclops-fixes`, HEAD `4b62aa6990b408b7013c38bdb95ef4f4038709c0`. All Round 2 findings have implementation changes. The clean reset, production build, API checks, two SQL RLS runs, realtime delivery and storage checks pass. Browser interaction remains unverified because the sandbox prevents Chromium from starting. Do not call this a Cyclops Round 3 acceptance pass until the browser script runs outside the sandbox.

### Round 2 item status

| R2 item | Status | Note |
| --- | --- | --- |
| 8 | Implemented; service realtime PASS | Migration 33 publishes messages/tickets with FULL identity; authenticated unique channels wait for PostgreSQL readiness, clean up, and deliver both replies/status within 10 seconds. |
| 11 | Fixed; service PASS | Team lead/member pickers use agent names and emails; all nested member/lead queries pass on the real database. |
| 12 | Implemented; API/hook checks PASS; browser PASS | Both URLs render the same AI screen directly; hooks precede returns, send waits for auth, empty-key API returns AI not configured. |
| 16 | Fixed in source; browser PASS | Overview reads the mapped createdAt field and guards invalid dates. |
| 26 | Implemented; browser console PASS | Removed the AI alias render-time redirect and redundant highlightAll, repaired realtime setup, and added missing dialog descriptions. |
| N1 | Implemented; storage/API PASS; browser PASS | Migration 34 creates a private bucket and messages.attachments; both sides upload, persist metadata and download signed PNGs under RLS. UI preserves failed drafts, reports errors with a toast, limits five files/10 MB each. |
| N2 | Fixed in source; browser PASS | Same Created field/format repair as item 16. |
| N3 | Fixed; resolver checks PASS | Helpers resolve SUPABASE_BIN/DOCKER_BIN or PATH, including paths with spaces, with clear missing-executable errors. |
| N4 | Fixed; SQL PASS | SQL creates its own fixture rows and scopes counts to them; consecutive runs and an extra-ticket adversarial run pass. |
| N5 | Fixed; install/build PASS | README explains recent Publishable/Secret labels and ANON_KEY/SERVICE_ROLE_KEY env names; packageManager pins pnpm 10.34.0 (no hard engines.pnpm, so pnpm 9 still works); lockfile unchanged. |
| N6 | Fixed in source; browser PASS | Both customer creation flows push the actual ticket ID to /portal/tickets/<id>; the new route shares ticket details. |
| N7 | Fixed in source; browser PASS | Customer screens use friendly status labels; unreadable staff profiles fall back to Support agent, with customer authors labelled Customer. |
| N8 | Fixed; service PASS | Same name/email pickers and displays as item 11; editing also persists team lead changes. |
| N9 | Fixed; source audit PASS; browser PASS | AST audit found 19 DialogContent/AlertDialogContent uses and zero missing descriptions. |

### Implementation details and conflicts

- Migration `20250101000033_ticket_realtime.sql` is the next version after 32. It adds only missing publication members and sets FULL identity on messages and tickets. These are every public table used by the app's postgres_changes subscriptions.
- The first cold-stack smoke reproduced a second realtime problem after publication membership was repaired: the SDK reports SUBSCRIBED before its system event reports `{extension: 'postgres_changes', status: 'ok'}`. The shared app helper now waits for both. A final fresh reset followed by the realtime check passes, and the ticket smoke separately exercises the actual app helpers. Fetch/realtime races preserve messages and the latest status.
- Migration 34 separates `<ticket_id>/public/...` reply files from `<ticket_id>/internal/...` note files. Authenticated staff can manage this bucket; customers can upload/read only their own public ticket paths. Anonymous users have no policy. Metadata validation enforces the ticket and visibility prefix, nonempty names/sizes, and the 10 MB limit. Message SELECT RLS continues to hide internal notes.
- The Round 2 hooks error was not reproducible in a browser here. Source inspection found no existing conditional hook in the chat or surrounding layouts. The alias used a render-time redirect; it now renders the canonical page directly. Hook lint passes. This is an implemented repair with runtime confirmed by the operator browser run (no hooks error), not a proven conditional-hook root cause.
- Earlier README versions reported pnpm 9 and Supabase 2.6.8 as the expected setup. The package now recommends pnpm 10 via packageManager, and the README distinguishes this Mac's installed CLI 2.6.8 from Cyclops's 2.122.0 and recent key labels. Global pnpm is still 9.15.4; the operator removed the engines.pnpm hard block so a plain `pnpm build` with pnpm 9 also works. The checked install/build explicitly use pnpm 10.34.0 through npm exec.
- The standing AGENTS instruction forbids headless Chrome in this sandbox. The requested browser script was attempted in headed mode. macOS sandbox permissions block that too. No headless browser run or screenshot is claimed.

### Finish-line commands and output

Execution host for every check: this Mac. Working directory: `/Users/dan/codex-lanes/coding/cf1/work`. Stack commands and Node verify helpers use `DOCKER_HOST=unix:///Users/dan/.colima/default/docker.sock`. Docker reports 29.5.2, Supabase CLI 2.6.8, Node 23.5.0, Next 15.1.6. Only the local zendesk-clone stack was started; no real OpenAI/Radar request, hosted database, demo, cloud account, remote, PR, CI file or Jest test/config was used or changed.

#### (a) Clean reset: PASS

```sh
DOCKER_HOST=unix:///Users/dan/.colima/default/docker.sock supabase start
DOCKER_HOST=unix:///Users/dan/.colima/default/docker.sock supabase db reset > /tmp/swift-ship-round3-reset.log 2>&1
```

Start and both reset runs returned exit 0. Start's credential output was captured in memory and suppressed. Final reset output:

```text
Resetting local database...
Recreating database...
Setting up initial schema...
Seeding globals from roles.sql...
Applying migration 20250101000001_initial_schema.sql...
Applying migration 20250101000002_knowledge_base.sql...
Applying migration 20250101000003_search_indexes.sql...
Applying migration 20250101000004_ticket_stats_functions.sql...
Applying migration 20250101000005_ticket_updates.sql...
Applying migration 20250101000006_ticket_stats_functions.sql...
Applying migration 20250101000007_shipping_articles.sql...
Applying migration 20250101000008_message_relationships.sql...
Applying migration 20250101000009_internal_notes.sql...
Applying migration 20250101000010_ticket_relationships.sql...
Applying migration 20250101000011_audit_logs_fk.sql...
Applying migration 20250101000012_shipment_tracking.sql...
Applying migration 20250101000013_add_sla_config_id.sql...
Applying migration 20250101000014_sla_management.sql...
Applying migration 20250101000015_disable_unsafe_sql.sql...
Applying migration 20250101000016_drop_execute_sql_function.sql...
Applying migration 20250101000017_add_updated_by.sql...
Applying migration 20250101000018_add_shipment_created_by.sql...
Applying migration 20250101000019_fix_updated_at_trigger.sql...
Applying migration 20250101000020_seed_agents.sql...
Applying migration 20250101000021_fix_updated_at_trigger.sql...
Applying migration 20250101000022_recreate_ticket_tags.sql...
Applying migration 20250101000023_insert_knowledge_categories.sql...
Applying migration 20250101000024_insert_additional_articles.sql...
Applying migration 20250101000025_recreate_ticket_tags.sql...
Applying migration 20250101000026_update_articles.sql...
Applying migration 20250101000027_create_embeddings.sql...
Applying migration 20250101000028_create_increment_article_feedback.sql...
Applying migration 20250101000029_update_shipment_trigger.sql...
Applying migration 20250101000030_complete_application_schema.sql...
Applying migration 20250101000031_row_security.sql...
Applying migration 20250101000032_application_functions.sql...
Applying migration 20250101000033_ticket_realtime.sql...
Applying migration 20250101000034_ticket_attachments.sql...
Seeding data from supabase/seed.sql...
Restarting containers...
Finished supabase db reset on branch cyclops-fixes.
```

#### (b) Empty-key production build: PASS

A mode-600 ignored throwaway `.env.local` was populated from `supabase status -o json` in memory. OpenAI, Radar and tracing keys were empty; no credential values were logged or added to Git. The env file was removed after verification.

```sh
npm exec --yes --package=pnpm@10.34.0 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@10.34.0 -- pnpm build > /tmp/swift-ship-round3-build.log 2>&1
```

Install returned exit 0, `Done in 4.9s using pnpm v10.34.0`. Lockfile format/content is unchanged. Build returned exit 0. Representative output:

```text
> zendesk-clone@0.1.0 build
> next build
▲ Next.js 15.1.6
Creating an optimized production build ...
✓ Compiled successfully
Skipping validation of types
Skipping linting
✓ Generating static pages (76/76)
Finalizing page optimization ...
Collecting build traces ...
```

The existing configuration still skips repository type/lint gates. `pnpm exec tsc --noEmit` returns exit 2 with legacy Next route-param types, missing customer/Supabase modules, Deno imports and unrelated service/page contracts. New conversation-service and team-service code has no remaining diagnostics in that run. The preexisting Node punycode deprecation warning remains in build/smoke processes; it is not a browser console result.

#### (c) Verify helpers and repeated SQL: PASS

The app was started for HTTP checks with `npm exec --yes --package=pnpm@10.34.0 -- pnpm start` on port 3000, with the same empty optional keys. Commands below all returned exit 0:

```sh
DOCKER_HOST=unix:///Users/dan/.colima/default/docker.sock node scripts/verify-schema.cjs
DOCKER_HOST=unix:///Users/dan/.colima/default/docker.sock node scripts/verify-auth.cjs --app-url http://localhost:3000
DOCKER_HOST=unix:///Users/dan/.colima/default/docker.sock node scripts/verify-ticket-flows.cjs --app-url http://localhost:3000
DOCKER_HOST=unix:///Users/dan/.colima/default/docker.sock node scripts/verify-realtime-storage.cjs
```

Exact helper output follows, excluding the repeated Node punycode warning:

schema:

```text
PASS: 40 literal .from references exist in the database
PASS: 9 literal .rpc references exist in the database
PASS: 45/45 public tables have RLS enabled
PASS: 7 compatibility views use security_invoker
PASS: 9 SECURITY DEFINER functions pin search_path
PASS: execute_sql has no remaining overloads
PASS: anon has no private-table or private-view grants
PASS: anon can execute no data-changing SECURITY DEFINER RPC
```

auth:

```text
PASS create-admin creates an auth account and admin agent; password sign-in succeeds
PASS signup immediately creates the matching customer profile with metadata name
PASS customer can sign out and sign in with a usable profile
PASS customer profile fields and preferences persist after a new query
PASS customer cannot insert themselves into agents
PASS GET /api/portal/profile returns customer data for form prefill
PASS PUT /api/portal/profile saves whitelisted fields and GET returns them
PASS profile API recreates an older account missing its customer profile
PASS customer agent create, update, delete and auth user delete requests return 403
PASS ordinary agents cannot delete other agents through the API
PASS customer shipment API returns empty state, creates an own shipment, and lists it
PASS customers are redirected to /403 from queue, roles and admin setup pages
PASS signed-out /portal/auth/register is reachable
PASS temporary smoke accounts removed
```

ticket-flows:

```text
PASS customer service creates a ticket without an invalid welcome agent
PASS app conversation helpers authenticate and wait for PostgreSQL readiness on three unique channels
PASS customer ticket list returns persisted ticket and mapped dates
PASS customer conversation begins with original description
PASS app message helper delivers customer reply to staff within 10 seconds
PASS agent list includes untagged tickets
PASS agent conversation includes original description and reply returns saved data
PASS app message helper delivers staff reply to customer within 10 seconds
PASS app message helper delivers internal note to staff
PASS offered open to in_progress transition persists through shared workflow RPC
PASS app ticket helper delivers customer status change within 10 seconds
PASS app customer message helper excludes internal notes
PASS customer sees saved replies and cannot see internal notes
PASS team picker and all member/lead queries return agent names and emails
PASS new-team and new-agent metrics return empty defaults without 406 errors
PASS admin ticket stats API returns real counts in the overview contract
PASS customer cannot access staff stats endpoint
PASS customer can read own SLA but cannot pause it
PASS AI support returns clear AI not configured response with empty key
PASS anonymous AI requests are rejected
PASS app subscription cleanup removes channels before signing out
PASS temporary ticket and account fixtures removed
```

realtime-storage:

```text
PASS supabase_realtime publishes public.messages and public.tickets
PASS messages and tickets use REPLICA IDENTITY FULL
PASS ticket-attachments is private with a size limit; messages store jsonb attachment metadata
PASS authenticated customer receives staff reply within 10 seconds without polling or reload
PASS authenticated staff receives customer reply within 10 seconds without polling or reload
PASS customer receives ticket status change live within 10 seconds
PASS internal notes reach staff and are withheld from customer realtime
PASS staff and customer PNG uploads persist with attachment metadata on messages
PASS staff downloads all attachments; owning customer downloads public attachments via signed URLs
PASS cross-customer, anonymous and customer internal-file reads/uploads are denied
PASS temporary realtime/storage fixtures removed
```

The SQL command was run twice sequentially on the same database after the final reset. Both exited 0 and ended in ROLLBACK:

```sh
DOCKER_HOST=unix:///Users/dan/.colima/default/docker.sock docker exec -i supabase_db_zendesk-clone psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/verify-rls.sql
DOCKER_HOST=unix:///Users/dan/.colima/default/docker.sock docker exec -i supabase_db_zendesk-clone psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/verify-rls.sql
```

First run output:

```text
BEGIN
INSERT 0 2
INSERT 0 1
INSERT 0 2
INSERT 0 3
INSERT 0 1
INSERT 0 2
INSERT 0 1
INSERT 0 2
DO
SET
NOTICE:  PASS: all public tables have RLS, execute_sql absent, signup creates customer and ignores role spoofing
NOTICE:  PASS: anon cannot read tickets
NOTICE:  PASS: anon cannot read customers
NOTICE:  PASS: anon cannot read agents
DO
NOTICE:  PASS: anon can read published knowledge articles
RESET
SET
 customer_claims_set
---------------------
 t
(1 row)

NOTICE:  PASS: customer cannot insert an agent/admin
NOTICE:  PASS: customer cannot assign roles
NOTICE:  PASS: customer cannot change ticket assignment
NOTICE:  PASS: customer cannot message another customer ticket
NOTICE:  PASS: customer cannot write internal messages
NOTICE:  PASS: customer cannot invoke staff status transition
NOTICE:  PASS: customer reads own SLA config/pauses but cannot pause tickets
NOTICE:  PASS: customer can create own shipment but cannot fabricate fulfillment status
NOTICE:  PASS: customer reads own rows, updates own profile, and sends own reply
DO
 admin_claims_set
------------------
 t
(1 row)

NOTICE:  PASS: status RPC rejects spoofed agent identity
NOTICE:  PASS: admin reads work data and transitions open to in_progress with history
DO
RESET
ROLLBACK
```

Second run output ends identically:

```text

NOTICE:  PASS: status RPC rejects spoofed agent identity
NOTICE:  PASS: admin reads work data and transitions open to in_progress with history
DO
RESET
ROLLBACK
```

An additional transaction-owned ticket was injected before assertions in a separate adversarial run; the fixture-scoped assertions passed and rolled back. Invalid SUPABASE_BIN and DOCKER_BIN checks produce clear missing-executable errors. Executable paths containing spaces and PATH discovery pass. All CJS/MJS syntax checks and git diff --check pass. Focused ESLint passes for realtime, attachments, teams and the browser script. AI/UI hook lint passes with existing unused-variable/any/prefer-const rules disabled; one existing inbox effect-dependency warning remains.

#### (d) Browser check: PASS (operator run, outside the Codex sandbox)

Codex could not launch Chromium inside its sandbox (Crashpad permission errors), so the operator ran the same script on the Mac mini outside the sandbox, after `supabase db reset`, an empty-key `pnpm build`, and with Playwright 1.64.1 from a temporary folder:

```sh
PLAYWRIGHT_MODULE=/tmp/swift-ship-round3-browser/node_modules/playwright node scripts/e2e/round3.mjs
```

Exit 0:

```text
PASS admin reply reaches customer within 10 seconds without reload
PASS customer reply reaches admin within 10 seconds without reload
PASS status reaches customer within 10 seconds with friendly label and no reload
PASS admin and customer PNG attachments survive reload and download via signed URLs
PASS customer ticket fits a 390px viewport and uses friendly status/author labels
PASS admin /ai-support loads and replies AI not configured
PASS admin /portal/ai-support loads and replies AI not configured
PASS customer /ai-support loads and replies AI not configured
PASS customer /portal/ai-support loads and replies AI not configured
PASS overview contains the new ticket and no Invalid date
PASS no page errors, console errors, realtime socket failures, or missing dialog descriptions
PASS temporary fixtures removed; browser and owned app server stopped; Supabase left running
```

Extra operator browser checks against `pnpm start` on port 3000 (not scripted in the repo):
- N6: a customer submitting /portal/tickets/new lands on /portal/tickets/<new id>, which shows the ticket, the description and the success toast.
- N8/#11: Create Team shows a "Team Lead" select listing agents as "Name (email)"; the dialog has a description; 0 console errors.

Not verified: real OpenAI or Radar calls, hosted Supabase, email delivery, screen readers, uploads above 1 KB in the browser (the 10 MB limit is enforced by the bucket and the metadata trigger).

### Commits and cleanup

Codex's sandbox could not create `.git/index.lock`, so the operator committed the Round 3 changes on `cyclops-fixes` in logical commits and pushed only that branch. The throwaway `.env.local` was removed and never staged. The local Supabase stack was stopped and Colima was stopped after testing.
