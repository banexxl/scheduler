# Security

## Core Principles

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code
- Never add the service-role key to a `NEXT_PUBLIC_` variable
- Never bypass Row Level Security for normal user queries
- Always authorize on the server
- Never trust tenant IDs from the client without verification
- Platform admins authenticated via `platform_admins` table (not email lists)
- Never authorize from user metadata

## Authentication Security

- Never use the admin client for authentication flows
- Never log passwords, tokens, or full session objects
- Never reveal whether an email exists (generic error messages)
- Never redirect to arbitrary external URLs
- All `next` parameters validated by `getSafeRedirectPath()`
- Server-side identity resolution — never route from client state alone
- Server Actions revalidate input with Yup (never trust client validation alone)
- Raw Supabase errors never exposed to users

## Supabase Client Security

### Browser Client
- Uses only the publishable (anon) key
- Subject to RLS policies
- Cannot access data outside user's permissions

### Server Client
- Uses the publishable key with cookie-based auth
- Operates as the authenticated user
- Subject to RLS policies
- Safe for Server Components, Actions, and Route Handlers

### Admin Client
- Uses the service-role key — **bypasses RLS**
- Protected by `import "server-only"`
- Cannot be imported into Client Components
- Throws if service-role key is missing
- Reserved for platform-level operations only
- Never used for authentication
- Never use to work around missing RLS policies

## Route Protection

| Area | Guard | On failure |
|------|-------|-----------|
| `/account/*` | `requireUser()` | Redirect to `/login` |
| `/platform/*` | `requirePlatformAdmin()` | 404 |
| `/app/[slug]/*` | `requireTenantMember(slug)` | 404 |
| `/app` | `requireUser()` | Redirect to `/login` |

Authorization occurs server-side in layouts (not client-side navigation guards).

## Redirect Security

`getSafeRedirectPath()` rejects:
- External URLs (`https://evil.com`)
- Protocol-relative URLs (`//evil.com`)
- JavaScript injection (`javascript:alert(1)`)
- Data URIs (`data:text/html,...`)

Only allows paths starting with exactly one `/`.

## Environment Variables

| Variable | Exposure | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + Server | Safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Never expose |
| `SUPABASE_PROJECT_ID` | Server only | Type generation only |

## Proxy

- Session refresh only — no business logic
- Never logs cookies, tokens, or keys
- Never makes data queries
- No auth redirects (authorization is in layouts)

## API Security

- Raw Supabase errors never in HTTP responses
- Health endpoints return safe generic messages
- Error logging uses sanitized messages

## Slug Availability Endpoint

`GET /api/businesses/slug-availability?slug=...`

Security measures:
- Requires authenticated user (returns 401 otherwise)
- Never exposes tenant details (names, IDs, statuses, owners)
- Returns only availability status boolean
- Uses `SECURITY DEFINER` RPC to bypass RLS without weakening policies
- The RPC has empty `search_path` and is restricted to `authenticated` role
- Never uses the admin/service-role client
- Cache-prevention headers (`no-store, no-cache, must-revalidate`)
- Input length capped (rejects >100 chars)
- Server-side format validation before database query
- Reserved slugs rejected before database query

## Business Creation Security

`features/business/actions/create-business.ts` (Server Action)

Security measures:
- Requires authenticated user (never trusts client state)
- Full server-side Yup validation (never trusts browser validation alone)
- Existing-membership check prevents creating multiple businesses
- Final slug recheck via RPC before creation
- Uses normal authenticated server client (never admin client)
- `create_tenant` RPC uses `auth.uid()` for owner relationship
- Duplicate-slug unique-index violations mapped to safe field error
- Raw PostgreSQL/Supabase errors never exposed to client
- No separate table inserts — atomic RPC only
- No client-provided owner ID or user lookup

## Business Dashboard Security

`/${tenantSlug}/dashboard`

- Protected by `requireTenantMember(tenantSlug)` in the layout
- Changing URL slug to another tenant returns 404 (no data leakage)
- Dashboard service receives already-authorized tenant ID
- Normal authenticated server client used (never admin)
- RLS active on all queries
- No customer-private data beyond aggregate count
- No subscription provider secrets displayed
- No raw database errors reach the UI
- Service errors show safe generic alert

## Business Settings Security

`/${tenantSlug}/settings`

- Server-side role enforcement: only owner and admin can update
- Manager and staff get read-only view (Server Action rejects their updates)
- Explicit update payload prevents mass assignment (never updates slug, status, created_by)
- URL fields validated as absolute HTTP/HTTPS only (rejects javascript:, ftp:, protocol-relative)
- Social links individually validated
- Normal authenticated server client with RLS
- No raw database errors exposed

## Rules for Development

1. Never import `lib/supabase/admin.ts` from client code
2. Never create a second proxy/middleware entry point
3. Never log credentials, cookies, tokens, or sessions
4. Never include raw database errors in API responses
5. Never disable RLS policies
6. Never use the admin client for normal user queries
7. Never commit `.env.local` or secrets
8. Never trust client-provided user IDs or roles
9. Never authorize from editable user metadata
10. Never create tenant/customer records during basic sign-up
11. Never implement platform-admin access from email allowlists
12. Never place private identity data in public page output
