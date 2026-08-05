# Scheduler Platform

A production-grade multi-tenant SaaS Scheduling Platform.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **UI:** Material UI 6
- **Forms:** React Hook Form + Yup
- **Styling:** CSS Modules + CSS custom properties
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (SSR via `@supabase/ssr`, email/password)

## Prerequisites

- Node.js 22+
- npm 10+
- Supabase project (for database type generation)

## Getting Started

```bash
npm install
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run type-check` | TypeScript type checking |
| `npm run clean` | Remove `.next` build cache |
| `npm run db:types` | Generate Supabase database types |

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin ops | Service role key (server-only) |
| `SUPABASE_PROJECT_ID` | For type gen | Used by `npm run db:types` |
| `NEXT_PUBLIC_APP_NAME` | Yes | Application display name |
| `NEXT_PUBLIC_APP_URL` | Yes | Full origin including protocol (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Yes | Hostname for subdomain routing (e.g. `localhost:3000`) |

## Database Types

Generate TypeScript types from your Supabase schema:

```bash
npx supabase login          # One-time authentication
npm run db:types            # Generate types
```

Output: `lib/supabase/database.types.ts`

## Project Structure

```
app/                → Pages, layouts, and route handlers
  (marketing)/      → Public marketing pages
  (auth)/           → Authentication flows
  (tenant-backoffice)/ → Tenant management
  (account)/        → Customer account
  (platform-admin)/ → Platform administration
  (site)/           → Public tenant websites
  api/              → API route handlers
components/         → Shared UI components
features/           → Feature-based domain modules
hooks/              → Custom React hooks
lib/                → Utility libraries and clients
  environment/      → Environment variable validation
  supabase/         → Supabase client factories
schemas/            → Yup validation schemas
services/           → Business logic service layer
styles/             → Global styles, CSS variables, MUI theme
types/              → Shared TypeScript type definitions
scripts/            → Build and utility scripts
public/             → Static assets
```

## Supabase Clients

| Client | Location | Use Case |
|--------|----------|----------|
| Browser | `lib/supabase/browser.ts` | Client Components |
| Server | `lib/supabase/server.ts` | Server Components, Actions, Route Handlers |
| Admin | `lib/supabase/admin.ts` | Platform admin operations (bypasses RLS) |

All clients are typed with the generated `Database` type.

## Architecture

- **One Tenant = One Business** — each tenant is a single business with multiple locations
- **Proxy** (`/proxy.ts`) refreshes Supabase sessions on every request
- **Environment validation** uses Yup schemas at startup
- **Server-only** modules prevent accidental client imports
- **RLS** enforces data access at the database level
- See `docs/` for detailed documentation

## URLs

| Purpose | URL Pattern |
|---------|-------------|
| Platform | `https://get-slot.app` |
| Business Dashboard | `https://get-slot.app/[slug]/dashboard` |
| Public Website | `https://[slug].get-slot.app` (future) |
