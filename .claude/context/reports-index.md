---
name: reports-index
description: Summaries of the investigation/roadmap reports under .kiro/reports/, with pointers to the full files
---

# Reports index

Full reports live at `.kiro/reports/`. These are historical write-ups —
useful for context on *why* something is the way it is, but not
authoritative on current code state. Verify against the actual code before
relying on any detail here.

## [16-roadmap.md](../../.kiro/reports/16-roadmap.md) (1619 lines)

A chronological, per-milestone changelog running from Milestone 4.1
(onboarding redirect logic) through Milestone 15.12 (Customer Booking
Experience 2.0), split into "Completed" and "Planned" sections. It
duplicates and predates much of what [[specs-index]] now covers in
`specs/features/*.md` — when the two disagree, trust the numbered spec
file (specs 91+) over this roadmap, since it's the more recently
maintained source for later milestones. Useful for a fast chronological
overview of what shipped and in what order; not useful as a single source
of truth for current behavior.

## [premium-dashboard-redesign.md](../../.kiro/reports/premium-dashboard-redesign.md) (273 lines)

Implementation plan/tracker for the dark-theme "premium" dashboard visual
redesign (design tokens, MUI dark theme, reusable `components/dashboard/`
primitives). Documents a design language: near-black backgrounds
(`#0a0a0f`/`#111118`/`#16161e`), purple accent (`#7C3AED`), specific text
and border colors. States which pages were redesigned already and which
remain — treat the "done/remaining" list as a snapshot, not current
status; check the actual components before assuming a page is/isn't
redesigned. Complements [[specs-index]] specs 91–93 (UI/UX redesign
specs), which describe the target look per audience; this report has the
concrete token values.

## [onboarding-rls-fix-report.md](../../.kiro/reports/onboarding-rls-fix-report.md) (203 lines)

Incident report: after milestones 10–13 shipped, the business onboarding
wizard broke with `infinite recursion detected in policy for relation
"tenant_members"` — a Postgres RLS policy evaluation loop. Root cause was
a policy on `tenant_members` that queried `tenant_members` again (via a
helper function) to check membership, and Postgres RLS evaluates all
applicable policies with OR logic, so the self-referencing check
recursed. Resolved; the fix pattern (avoid a policy on table X calling a
function that re-queries table X) is worth remembering before adding new
RLS policies on tenant-scoped tables — see `.kiro/steering/security.md`
for the general RLS rules.

## [tenant-deletion-investigation.md](../../.kiro/reports/tenant-deletion-investigation.md) (134 lines)

Investigation (Milestone 13.1, sections 18–19) into what actually happens
when a tenant or its auth user is deleted: maps the `ON DELETE CASCADE`
chain from `tenants.id` across `tenant_members`, `locations`, `services`,
`resources`, `appointments`, `tenant_booking_rules`,
`tenant_public_booking_settings`, `tenant_onboarding`,
`tenant_subscriptions`, `tenant_notification_settings`, and more.
Superseded operationally by [[specs-index]] spec
`87-tenant-lifecycle-deletion-retention.md`, which defines the actual
lifecycle/retention policy — read that spec first for current behavior,
this report for the underlying cascade mechanics it was investigating.
