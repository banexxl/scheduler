# Scheduler Platform — Project Context for Claude Code

This file is Claude Code's entry point for this repo. It condenses the
project's own knowledge base at `.kiro/` (steering rules, ADRs, feature
specs, investigation reports). **When in doubt, read the source file in
`.kiro/` directly — this is a summary, not a replacement.**

## What this app is

A production-grade **multi-tenant scheduling SaaS** ("get-slot.app"). One
tenant = one business. Each tenant gets, under one Next.js app:

- A public booking website (customer-facing, subdomain-routed)
- A backoffice (dashboard, settings, staff, locations, services, calendar)
- Customers (bookings, self-service management, loyalty, reviews)
- Staff (profiles, schedules, availability, "my day" view)
- Branding (per-tenant theme stored in the database)
- Billing via Polar (subscriptions, appointment payments, packages, refunds)

Customer identity is **global** (one Supabase Auth account per person, ADR
0006) — a person can be a customer of many tenants, or a member of one.
Platform admins are a separate, database-backed role (`platform_admins`
table), never an email allowlist.

## Tech stack

- Next.js 16 (App Router, Turbopack) — **not the Next.js you remember**;
  check `node_modules/next/dist/docs/` before relying on training data for
  Next-specific APIs (see [AGENT.md](../AGENT.md)).
- TypeScript, strict mode. React 19. Node 22+, npm 10+.
- Supabase (PostgreSQL + RLS) for auth and data. Types generated to
  `lib/supabase/database.types.ts` via `npm run db:types`.
- Material UI for the backoffice; CSS Modules + CSS custom properties for
  the public site (theme values come from the database, not hardcoded CSS).
- Formik + Yup for forms/validation (not React Hook Form despite what
  README says in one place — check actual usage in `features/*`).
- Polar for billing/payments.
- Vitest (unit/integration) + Playwright (e2e).
- **Not used:** Tailwind, shadcn/ui, Redux, Prisma, Drizzle, Turborepo, `src/` layout, monorepo (`apps/web`).

## Project structure

```
app/            Pages, layouts, route handlers (App Router)
  (marketing)/  Public marketing pages
  (auth)/       Auth flows
  platform/     Platform admin
  book/         Public booking flow
  api/          Route handlers
components/     Shared UI components
features/       Feature-first domain modules (auth, booking, staff, billing, ...)
hooks/          Shared React hooks
lib/            Clients, env validation, security, scheduling helpers
  supabase/     browser.ts / server.ts / admin.ts clients
schemas/        Yup validation schemas
styles/         Global styles, MUI theme, CSS variables
types/          Shared TS types
scripts/        Build/maintenance scripts
proxy.ts        Session-refresh only (no business logic, no auth redirects)
```

Route groups map to audiences: `(marketing)`, `(auth)`, tenant backoffice,
`(account)` for customers, `platform` for platform admins, and an internal
`(site)` rendering area for public tenant sites resolved via hostname
rewriting (not a public route itself).

Feature-first: when working on a feature, its code lives under
`features/<name>/` (actions, services, components) rather than being
scattered by technical layer.

## Where to look before implementing

1. **Feature spec** — `.kiro/specs/features/NN-name.md`. 92 numbered specs
   covering everything from `04-supabase.md` and `05-authentication.md`
   through billing, staff, marketing automation, gift cards, referrals, and
   production-readiness passes. Read the matching spec before touching a
   feature area. [.claude/context/specs-index.md](context/specs-index.md)
   has a one-line-per-spec map, grouped by theme, to help you find the
   right file fast.
2. **Steering rules** (always-applied) — full text imported below, sourced
   from `.kiro/steering/`.
3. **Architecture decisions** — full text imported below, sourced from
   `.kiro/decisions/0001..0006` (global auth, single Next.js app, no
   Tailwind, MUI backoffice, CSS Modules public site, global customer
   account).
4. **Reports** — `.kiro/reports/` has a large roadmap doc and past
   investigation write-ups (RLS onboarding fix, tenant-deletion
   investigation, dashboard redesign). Useful history, not current truth —
   verify against code. [.claude/context/reports-index.md](context/reports-index.md)
   summarizes each one and says what it's still good for.

Note: `.claude/context/` is a synced copy for fast indexing and full
auto-loading of the small always-relevant files — `.kiro/` remains the
source of truth. If you edit steering or decisions content, edit it in
`.kiro/` first and re-sync the copy under `.claude/context/`.

## Steering rules (always-applied, full text from `.kiro/steering/`)

@context/steering/product.md
@context/steering/tech.md
@context/steering/structure.md
@context/steering/coding-standards.md
@context/steering/ui-guidelines.md
@context/steering/security.md

## Architecture decisions (full text from `.kiro/decisions/`)

@context/decisions/0001-global-auth.md
@context/decisions/0002-single-nextjs-app.md
@context/decisions/0003-no-tailwind.md
@context/decisions/0004-mui-backoffice.md
@context/decisions/0005-css-modules-public-site.md
@context/decisions/0006-global-customer-account.md

## Common commands

```bash
npm run dev              # dev server (Turbopack)
npm run lint             # ESLint
npm run type-check       # tsc --noEmit
npm run test             # vitest unit tests
npm run test:integration # integration tests (env-gated)
npm run e2e              # Playwright e2e
npm run db:types         # regenerate lib/supabase/database.types.ts
npm run verify:rc        # full pre-release check (lint, types, build, start, tests)
```

## Notes for future edits to this file

- `.kiro/` is the source of truth. `.claude/context/steering/` and
  `.claude/context/decisions/` are verbatim copies kept only so the
  `@import` lines above can auto-load them every session — if you edit a
  steering rule or add a decision, edit it under `.kiro/` and copy the
  updated file into `.claude/context/` too (or the two will drift).
- `.claude/context/specs-index.md` and `.claude/context/reports-index.md`
  are hand-written indices, not imports — they need a one-line addition
  whenever a new spec or report file is added to `.kiro/`.
- Specs and reports themselves are intentionally **not** auto-imported —
  there are 92+ of them and importing all of them would bloat every
  session with mostly-irrelevant content. Read the matching file on demand
  instead.
