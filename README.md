# Swift Ship

A local shipping support app built with Next.js and Supabase. Customers can register, manage their profile, create support tickets, read replies, and browse the knowledge base. Staff can manage tickets and teams. Maps and AI chat are optional integrations.

## Prerequisites

- Node.js 20 or newer and pnpm 10. `packageManager` pins pnpm 10.34.0. Use `pnpm` if pnpm 10 is already installed. Otherwise use either version-pinned runner below for each command.
- Docker running, including Docker Desktop or Colima. On a Colima installation, use your existing `DOCKER_HOST`; do not change global Docker contexts.
- Supabase CLI 2.x available as `supabase`, plus Docker available as `docker`. Recent CLI releases label the local API keys **Publishable** and **Secret**. The environment names below apply to both older and newer CLI 2.x versions.

Run every command below from the repository root. The first Supabase start downloads container images and can take several minutes.

## Local setup

Check `pnpm --version`. If pnpm 10 is unavailable or a Corepack shim fails, use one of these runners instead of `pnpm` throughout this guide:

```sh
npx --yes pnpm@10.34.0 install --frozen-lockfile
# Equivalent alternative:
npm exec --yes --package=pnpm@10.34.0 -- pnpm install --frozen-lockfile
```

Both bypass Corepack's cache, which may be unwritable in restricted environments. `COREPACK_ENABLE_STRICT=0` can relax a Corepack version mismatch, but does not fix cache permissions; use a runner above for cache errors.

With pnpm 10 installed:

```sh
pnpm install --frozen-lockfile
supabase start
supabase db reset
cp .env.example .env.local
supabase status -o env
```

Copy the values from your own local `supabase status -o env` into `.env.local`. Keep this credential output private. The environment output uses `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY`, even when the status table uses Publishable and Secret labels:

- `NEXT_PUBLIC_SUPABASE_URL`: `API_URL`, normally `http://127.0.0.1:54321`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `ANON_KEY`. The browser uses this key with row-level security.
- `SUPABASE_SERVICE_ROLE_KEY`: `SERVICE_ROLE_KEY`. This is server-only and used for explicit admin provisioning.
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000`.

The pnpm 10 install may report skipped optional dependency build scripts; the checked build does not require them. The lockfile format is unchanged.

`.env.local` is ignored by Git. Never put the service role key in a `NEXT_PUBLIC_` variable, source file, screenshot, or issue. Do not copy hosted credentials into this local setup. `.env.example` contains no usable credentials.

```sh
pnpm dev
```

If a sandbox blocks native filesystem notifications and the dev server returns 404 for existing routes, enable polling:

```sh
WATCHPACK_POLLING=true pnpm dev
```

The default dev command uses Next.js's regular compiler.

Open `http://localhost:3000/auth/signup` or `/portal/auth/register`. Local email confirmation is disabled in `supabase/config.toml`, so a new local account can sign in immediately. If you enable confirmations, the confirmation page explains the next step; local mail is visible at `http://127.0.0.1:54324`. The auth callback accepts both localhost and 127.0.0.1 on port 3000.

Signup creates a customer profile automatically. The app also attempts a safe profile repair if the row is missing. It shows an explicit error if repair fails. Customer accounts cannot promote themselves to staff.

## Create the first admin

With the local stack running and the server variables set in `.env.local`:

```sh
pnpm create-admin --email you@example.com --password 'replace-with-your-local-password' --name 'Your name'
```

Use your own password of at least eight characters. To keep it out of shell history, set `ADMIN_PASSWORD` in your terminal environment and omit `--password`. The script reads keys only from the environment or `.env.local` and never prints them. It creates a confirmed Auth user and an `agents` row with role `admin`. If that email already exists, it promotes the existing account and keeps its current password. Then sign in at `/auth/signin` and open `/tickets/overview`.

Only admins manage agents and roles. Staff have access to ticket work and team pages; customer attempts to open staff pages redirect to `/403`. The database enforces ownership independently of page guards.

## Optional services

- `NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY`: enables address lookup, shipment maps, and route estimates. Leave it empty to use auth, tickets, profiles, the knowledge base, and shipment lists. Map/address controls explain that maps are unavailable. Quote route calculation shows an error with retry and edit-address actions when Radar is missing or fails. No fabricated route is used by the quote form.
- `OPENAI_API_KEY`: server-only. Leave it empty and AI chat replies with **AI not configured**, with links through the app to support and the knowledge base. When configured, the local `/api/ai-support` route answers chat questions; it does not claim to create or change tickets or shipments. A real provider request was not part of local validation.
- LangSmith tracing and Edge Function configuration are optional. The standard local chat endpoint does not require deploying Edge Functions. Existing experimental Edge Function agents are outside this setup; their deployment settings are unchanged.

## Database and validation

`supabase db reset` destroys and rebuilds this project's local database. Do not point it at a hosted database. Migrations have unique timestamp versions in `supabase/migrations/`. Historical manual rollback SQL lives in `supabase/rollbacks/`, outside the CLI's forward migration directory. These rollback files are historical and are not a tested reverse path for the repaired schema. Prefer a reset for a disposable development database; use reviewed forward migrations for existing data.

Seed data includes knowledge-base articles, categories, and reference configuration. It does not create fake customers or agents or require nonexistent Auth users. All public tables have row-level security. Anonymous access is limited to published knowledge-base content and its categories. The arbitrary `execute_sql` endpoint has been removed.

```sh
pnpm verify
node scripts/verify-schema.cjs
node scripts/verify-auth.cjs --app-url http://localhost:3000
node scripts/verify-ticket-flows.cjs --app-url http://localhost:3000
node scripts/verify-realtime-storage.cjs
docker exec -i supabase_db_zendesk-clone psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/verify-rls.sql
```

The Node smoke helpers resolve `supabase` from `SUPABASE_BIN` or PATH and `docker` from `DOCKER_BIN` or PATH. Overrides are executable paths, not shell commands. For example, set `SUPABASE_BIN=/path/to/supabase` and `DOCKER_BIN=/path/to/docker`; missing executables produce a clear error. Use your existing `DOCKER_HOST` if your container runtime requires it.

The Node smoke helpers are local-only, discover local credentials in memory via the Supabase CLI, and suppress sensitive failure details. Auth and ticket helpers create and remove temporary test users. The SQL check owns its fixtures, checks only those rows, and rolls back. Run it twice on the same database. The realtime/storage helper checks publication membership, replica identity, private bucket configuration, two authenticated realtime clients, uploads and signed downloads, and customer/internal-file isolation. The HTTP checks require the app to run with the real local anon key, not the placeholders used for a build-only check.

For the browser checks, install Playwright and Chromium in a separate verification folder, or use the existing `../verify` installation. After building with empty optional keys, run:

```sh
node scripts/e2e/round3.mjs --headed
```

The script starts and stops its own production server on port 3013, creates and removes local fixtures, and leaves Supabase running. It forces optional keys empty in the server process and blocks external browser requests. It checks two browser sessions, live replies and status, attachment persistence/downloads, both AI URLs for both roles, overview dates, mobile ticket width, rejected HTML files/storage uploads, failed-upload draft preservation, and the admin status menu at 390×844. Use `--port` to choose another unused port. `PLAYWRIGHT_MODULE` can point to a Playwright module installed outside this repo. Run without `--headed` only outside sandboxes that prohibit headless Chrome.

Ticket attachments are private, limited to five nonempty files per reply and 10 MB per file. Supported files are PNG, JPEG, GIF, WebP, HEIC, PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, PPT/PPTX, ODT/ODS and ZIP; both extension and MIME must match. Unknown/empty MIME types are rejected with a message. HTML, SVG, scripts, executables and other types are blocked. Both staff and customers can attach files. Failed uploads show an error and preserve the draft. Downloads use short-lived signed URLs with attachment disposition and the original filename. Customers can read public replies and their files only on their own tickets; internal notes and their files remain staff-only. Migration 33 publishes `messages` and `tickets` to realtime, migration 34 adds the bucket and message metadata, and migration 35 enforces attachment types. Apply them on an existing development database with `supabase migration up`; use reset for a disposable database.

`pnpm verify` runs `pnpm typecheck`, `pnpm lint`, and `pnpm build` in sequence. Production builds enforce type checking and lint too. The app TypeScript project excludes Deno Edge Functions and the separately owned Jest tests; see the Round 4 report for scope and validation. Run the existing Jest suite separately with `pnpm test`. See `REPORT.md` for the exact checks, limitations, and issue-by-issue results. Some analytics and ticket-follower panels are explicitly labelled sample data; they do not represent activity in your local database.

Stop the app with Ctrl-C. To stop only this local Supabase project when finished:

```sh
supabase stop --no-backup
```
