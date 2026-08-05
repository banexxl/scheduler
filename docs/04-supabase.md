# Supabase Integration

## Overview

The platform uses Supabase for database, authentication, and real-time features. Integration is built on `@supabase/ssr` (not the deprecated Auth Helpers).

## Why Not Auth Helpers

The `@supabase/auth-helpers-nextjs` package is deprecated. The current approach uses `@supabase/ssr` which provides:

- First-class SSR cookie management
- Compatible with Next.js App Router and Server Components
- Framework-agnostic cookie adapters

## Client Architecture

### Browser Client (`lib/supabase/browser.ts`)

- Used in Client Components
- Created via `createBrowserClient` from `@supabase/ssr`
- Operates as the authenticated user
- Respects RLS policies
- Does NOT use service-role key

```ts
import { createClient } from "@/lib/supabase/browser";

const supabase = createClient();
const { data } = await supabase.from("tenants").select("*");
```

### Server Client (`lib/supabase/server.ts`)

- Used in Server Components, Server Actions, and Route Handlers
- Created via `createServerClient` from `@supabase/ssr`
- Async factory (cookies API is async in Next.js 16)
- Operates as the authenticated user
- Respects RLS policies
- Cookie writes may fail in Server Components (expected)

```ts
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data } = await supabase.from("tenants").select("*");
```

### Admin Client (`lib/supabase/admin.ts`)

- Server-only (uses `import "server-only"`)
- Created via `createClient` from `@supabase/supabase-js`
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- **Bypasses RLS** — use only for platform admin operations
- Throws if service-role key is not configured

```ts
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient();
// Full database access, no RLS
```

## Session Refresh

Session refresh is handled by two files working together:

1. **`/proxy.ts`** — Root Next.js proxy entry point
2. **`/lib/supabase/proxy.ts`** — Reusable session refresh helper

On every request, the proxy:
1. Creates a Supabase SSR client with request cookies
2. Calls `getUser()` to validate/refresh the session
3. Propagates any refreshed cookies to the response
4. Returns the response (no redirects or auth checks yet)

## Database Types

Types are generated from the live Supabase schema:

```bash
npm run db:types
```

Prerequisites:
1. Set `SUPABASE_PROJECT_ID` in `.env.local`
2. Authenticate: `npx supabase login`

Output: `lib/supabase/database.types.ts`

All clients are typed with the `Database` type for full type safety.

## Environment Variables

| Variable | Scope | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | For admin operations |
| `SUPABASE_PROJECT_ID` | Server-only | For type generation |

## Existing Database

The database schema includes:

- `platform_admins` — Platform administrator records
- `tenants` — Multi-tenant organizations
- `tenant_members` — Users within tenants
- `tenant_customers` — Customers of tenants
- `tenant_customer_private` — Private customer data
- `locations` — Tenant business locations
- `subscription_plans` — Available plans
- `tenant_subscriptions` — Active subscriptions
- `subscription_events` — Subscription lifecycle events
- `audit_logs` — Audit trail

RPC functions:
- `create_tenant()` — Tenant onboarding
- `register_as_tenant_customer()` — Customer registration

Row Level Security is enabled on all tables.

## Current Scope (Milestone 2)

Implemented:
- Client factories (browser, server, admin)
- Session refresh via proxy
- Environment validation
- Database type generation script
- Health check endpoint

Deferred to future milestones:
- Authentication forms
- Route authorization/redirects
- Tenant lookups in proxy
- Subdomain routing
- Business feature queries
