# Swift Ship

A local shipping support app built with Next.js and Supabase. Customers can register, manage their profile, create support tickets, read replies, and browse the knowledge base. Staff can manage tickets and teams. Maps and AI chat are optional integrations.

## Prerequisites

- Node.js 20 or newer and pnpm 9. This checkout was validated with pnpm 9.15.4.
- Docker running, including Docker Desktop or Colima. On a Colima installation, use your existing `DOCKER_HOST`; do not change global Docker contexts.
- Supabase CLI available as `supabase`. Local validation used CLI 2.6.8 and PostgreSQL 15.

Run every command below from the repository root. The first Supabase start downloads container images and can take several minutes.

## Local setup

```sh
pnpm install --frozen-lockfile
supabase start
supabase db reset
cp .env.example .env.local
supabase status
```

Copy the **API URL**, **anon key**, and **service_role key** from your own local `supabase status` into the corresponding variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: the local API URL, normally `http://127.0.0.1:54321`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the local anon key. The browser uses this key with row-level security.
- `SUPABASE_SERVICE_ROLE_KEY`: the local service_role key. This is server-only and used for explicit admin provisioning.
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000`.

`.env.local` is ignored by Git. Never put the service role key in a `NEXT_PUBLIC_` variable, source file, screenshot, or issue. Do not copy hosted credentials into this local setup. `.env.example` contains no usable credentials.

```sh
pnpm dev
```

If a sandbox blocks native filesystem notifications and the dev server returns 404 for existing routes, enable polling:

```sh
WATCHPACK_POLLING=true pnpm dev
```

This fallback was required for the local sandbox verification. The default dev command uses Next.js's regular compiler.

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
pnpm build
node scripts/verify-schema.cjs
node scripts/verify-auth.cjs --app-url http://localhost:3000
node scripts/verify-ticket-flows.cjs --app-url http://localhost:3000
docker exec -i supabase_db_zendesk-clone psql -U postgres -d postgres -v ON_ERROR_STOP=1 < scripts/verify-rls.sql
```

The Node smoke helpers are local-only, discover local credentials in memory via the Supabase CLI, and suppress sensitive failure details. Auth and ticket helpers create and remove temporary test users. The SQL check wraps fixtures in a transaction and rolls it back. The HTTP checks require the app to run with the real local anon key, not the placeholders used for a build-only check.

The existing production configuration skips TypeScript and ESLint gates during `next build`. A successful build does not imply the legacy Jest suite or repository-wide type checks pass. See `REPORT.md` for the exact checks, limitations, and issue-by-issue results. Some analytics and ticket-follower panels are explicitly labelled sample data; they do not represent activity in your local database.

Stop the app with Ctrl-C and stop only this project's local Supabase stack when finished:

```sh
supabase stop --no-backup
```
