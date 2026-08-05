# Scheduler Platform

A production-grade multi-tenant SaaS Scheduling Platform.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **UI:** Material UI 6
- **Forms:** React Hook Form + Yup
- **Styling:** CSS Modules + CSS custom properties
- **Database:** Supabase (future milestone)
- **Auth:** Supabase Auth (future milestone)

## Prerequisites

- Node.js 22+
- npm 10+

## Getting Started

```bash
npm install
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

## Project Structure

```
app/                → Pages, layouts, and route handlers
  (marketing)/      → Public marketing pages (/, /pricing, /features)
  (auth)/           → Authentication flows (/login, /register, etc.)
  (tenant-backoffice)/ → Tenant management (/app/[tenantSlug]/...)
  (account)/        → Customer account (/account/...)
  (platform-admin)/ → Platform administration (/platform/...)
  (site)/           → Public tenant websites (/[tenantSlug]/...)
  api/              → API route handlers
components/         → Shared UI components
  common/           → Generic reusable components
  layout/           → Layout-level components (ThemeRegistry)
  navigation/       → Navigation components
  forms/            → Form components
  feedback/         → Feedback/notification components
features/           → Feature-based domain modules
  auth/             → Authentication feature
  tenant/           → Tenant management feature
  platform/         → Platform admin feature
hooks/              → Custom React hooks
lib/                → Utility libraries and clients
  supabase/         → Supabase client configuration
schemas/            → Yup validation schemas
services/           → Business logic service layer
styles/             → Global styles, CSS variables, MUI theme
types/              → Shared TypeScript type definitions
scripts/            → Build and utility scripts
public/             → Static assets (images, icons, logos)
```

## Architecture Decisions

- **Route groups** separate concerns without affecting URL structure
- **Feature folders** contain domain-specific actions, components, hooks, schemas, services, and types
- **Proxy** (Next.js 16 equivalent of middleware) handles request interception
- **ThemeRegistry** wraps the app in MUI's ThemeProvider as a client component
- **CSS variables** mirror the MUI theme for use in CSS Modules
- **Barrel exports** in `styles/theme/` keep imports clean

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

See `.env.example` for all required variables.
