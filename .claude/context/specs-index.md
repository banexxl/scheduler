---
name: specs-index
description: One-line index of every feature spec under .kiro/specs/features/, organized by milestone theme, with pointers to the full file
---

# Feature specs index

Full specs live at `.kiro/specs/features/NN-name.md` (92 files, ~10,500 lines
total — too large to load in full here). Read the linked file directly
before working on a feature area; this index exists to help you find the
right file fast, and to give a rough map of what has been built.

Numbering is roughly chronological by milestone, not by topic. Everything
below is "Completed" per its own spec unless noted otherwise — verify
against code, since some later specs (91+) describe redesigns of earlier
ones.

## Core platform foundation (specs 04–19)

- [04-supabase.md](../../.kiro/specs/features/04-supabase.md) — Supabase integration via `@supabase/ssr`; DB, auth, realtime.
- [05-authentication.md](../../.kiro/specs/features/05-authentication.md) — Global identity model: one Supabase Auth account per person.
- [06-database.md](../../.kiro/specs/features/06-database.md) — Core table inventory (tenants, tenant_members, customers, audit_logs, etc.); incremental-migrations-only rule.
- [07-platform-admin.md](../../.kiro/specs/features/07-platform-admin.md) — Platform admin access via `platform_admins` table (never an email allowlist).
- [08-tenants.md](../../.kiro/specs/features/08-tenants.md) — Tenant/business model: one tenant = one business.
- [09-customer-account.md](../../.kiro/specs/features/09-customer-account.md) — Global `/account/*` area for any authenticated user.
- [10-public-site.md](../../.kiro/specs/features/10-public-site.md) — Public tenant site rendered via the internal `(site)` hostname-routed area.
- [17-business-onboarding.md](../../.kiro/specs/features/17-business-onboarding.md) — New-business onboarding form and validation.
- [18-business-dashboard.md](../../.kiro/specs/features/18-business-dashboard.md) — First dashboard view after business creation.
- [19-business-settings.md](../../.kiro/specs/features/19-business-settings.md) — Business settings CRUD page.

## Locations, resources, services (20–30)

- [20-location-management.md](../../.kiro/specs/features/20-location-management.md) — Location CRUD; every business has ≥1 location.
- [21-working-hours.md](../../.kiro/specs/features/21-working-hours.md) — Weekly working hours per location (7 rows, DB-trigger-initialized).
- [22-location-schedule-exceptions.md](../../.kiro/specs/features/22-location-schedule-exceptions.md) — Date-specific overrides (holidays, closures) to working hours.
- [23-resource-foundation.md](../../.kiro/specs/features/23-resource-foundation.md) — Generic schedulable-entity model (staff, rooms, equipment).
- [24-business-media.md](../../.kiro/specs/features/24-business-media.md) — Image management via Supabase Storage, tenant-scoped paths.
- [25-service-categories.md](../../.kiro/specs/features/25-service-categories.md) — Organizational grouping for services (no booking-behavior effect).
- [26-services.md](../../.kiro/specs/features/26-services.md) — Bookable service offerings: duration, price, buffers.
- [27-service-locations.md](../../.kiro/specs/features/27-service-locations.md) — Which services are offered at which locations.
- [28-service-resources.md](../../.kiro/specs/features/28-service-resources.md) — Which resources are qualified to perform which services.
- [29-resource-schedules.md](../../.kiro/specs/features/29-resource-schedules.md) — Resource working hours and time-off exceptions.
- [30-location-business-hours.md](../../.kiro/specs/features/30-location-business-hours.md) — Location-level operating hours and exceptional closures.

## Availability, booking, appointments (31–39)

- [31-availability-foundation.md](../../.kiro/specs/features/31-availability-foundation.md) — Deterministic, tenant-safe, timezone-aware slot-candidate engine.
- [32-booking-rules.md](../../.kiro/specs/features/32-booking-rules.md) — Policies constraining *when* candidate slots may be booked.
- [33-appointment-foundation.md](../../.kiro/specs/features/33-appointment-foundation.md) — Persistent appointments, conflict protection, management UI.
- [34-internal-appointment-calendar.md](../../.kiro/specs/features/34-internal-appointment-calendar.md) — Internal day/week calendar with drag-and-drop rescheduling.
- [35-public-booking-foundation.md](../../.kiro/specs/features/35-public-booking-foundation.md) — Public tenant-branded booking flow (service → time → contact details).
- [36-appointment-notifications.md](../../.kiro/specs/features/36-appointment-notifications.md) — Notification foundation for appointment lifecycle events.
- [37-appointment-reminders.md](../../.kiro/specs/features/37-appointment-reminders.md) — Scheduled appointment reminders.
- [38-customer-appointment-self-service.md](../../.kiro/specs/features/38-customer-appointment-self-service.md) — Token-based self-service (view/manage a booking without an account).
- [39-self-service-rollout-checklist.md](../../.kiro/specs/features/39-self-service-rollout-checklist.md) — Production rollout checklist for self-service (Milestone 6.14).

## Billing via Polar (40–41, 44, 68–76)

- [40-polar-foundation-products-prices.md](../../.kiro/specs/features/40-polar-foundation-products-prices.md) — Billing catalog foundation: products, prices, webhook ingestion.
- [41-platform-admin-polar-checkout-customers.md](../../.kiro/specs/features/41-platform-admin-polar-checkout-customers.md) — Platform-admin billing ops; tenant checkout/customer foundation.
- [44-tenant-subscription-experience.md](../../.kiro/specs/features/44-tenant-subscription-experience.md) — Tenant-facing subscription status and plan-based feature enforcement.
- [68-appointment-payment-foundation.md](../../.kiro/specs/features/68-appointment-payment-foundation.md) — Appointment payment model and payment-intent foundation.
- [69-polar-appointment-checkout.md](../../.kiro/specs/features/69-polar-appointment-checkout.md) — Polar checkout for paid appointments.
- [70-polar-appointment-payment-webhooks.md](../../.kiro/specs/features/70-polar-appointment-payment-webhooks.md) — Webhook-driven payment confirmation.
- [71-appointment-payment-requirements.md](../../.kiro/specs/features/71-appointment-payment-requirements.md) — Payment requirement/deadline rules integrated into booking.
- [72-polar-appointment-refunds.md](../../.kiro/specs/features/72-polar-appointment-refunds.md) — Refund flow via Polar.
- [73-polar-package-purchases.md](../../.kiro/specs/features/73-polar-package-purchases.md) — Purchasing service packages through Polar.
- [74-polar-tenant-resource-sync.md](../../.kiro/specs/features/74-polar-tenant-resource-sync.md) — Syncing tenant products/discounts/resources with Polar.
- [75-payment-history-receipts-financial-dashboard.md](../../.kiro/specs/features/75-payment-history-receipts-financial-dashboard.md) — Payment history, receipts, financial dashboard.
- [76-polar-reconciliation-production-hardening.md](../../.kiro/specs/features/76-polar-reconciliation-production-hardening.md) — Reconciliation and recovery hardening for billing.

## Business dashboard, UX, customer features (45, 48–59)

- [45-business-onboarding.md](../../.kiro/specs/features/45-business-onboarding.md) — Business onboarding wizard (Milestone 8.1, supersedes 17 in part).
- [48-business-dashboard-analytics.md](../../.kiro/specs/features/48-business-dashboard-analytics.md) — Dashboard analytics widgets.
- [49-public-booking-ux-branding.md](../../.kiro/specs/features/49-public-booking-ux-branding.md) — Public booking UX and per-tenant branding polish.
- [50-customer-portal-booking-history.md](../../.kiro/specs/features/50-customer-portal-booking-history.md) — Customer portal booking history.
- [51-customer-reviews-feedback.md](../../.kiro/specs/features/51-customer-reviews-feedback.md) — Reviews and feedback collection.
- [52-waitlist-slot-recovery.md](../../.kiro/specs/features/52-waitlist-slot-recovery.md) — Waitlist and cancellation slot recovery.
- [54-service-packages.md](../../.kiro/specs/features/54-service-packages.md) — Service packages and bundles.
- [55-customer-loyalty-rewards.md](../../.kiro/specs/features/55-customer-loyalty-rewards.md) — Loyalty points and rewards.
- [56-customer-accounts-identity-linking.md](../../.kiro/specs/features/56-customer-accounts-identity-linking.md) — Linking a global identity across multiple tenant customer records.
- [57-unified-customer-dashboard.md](../../.kiro/specs/features/57-unified-customer-dashboard.md) — Cross-tenant customer dashboard.
- [58-customer-favorites-rebooking.md](../../.kiro/specs/features/58-customer-favorites-rebooking.md) — Favorites and one-click rebooking.
- [59-customer-notification-preferences.md](../../.kiro/specs/features/59-customer-notification-preferences.md) — Notification preferences and communication center.

## Hardening passes (60–67) — Completed August 2026

- [60-authorization-security-audit.md](../../.kiro/specs/features/60-authorization-security-audit.md) — Full authorization and route-protection audit (Milestone 10.1).
- [61-server-client-page-architecture.md](../../.kiro/specs/features/61-server-client-page-architecture.md) — Server/Client page architecture convention.
- [62-performance-query-audit.md](../../.kiro/specs/features/62-performance-query-audit.md) — Performance and data-access efficiency audit.
- [63-observability-error-handling.md](../../.kiro/specs/features/63-observability-error-handling.md) — Observability and error-handling audit.
- [64-mobile-accessibility-ux-audit.md](../../.kiro/specs/features/64-mobile-accessibility-ux-audit.md) — Mobile, accessibility, UX consistency audit.
- [65-e2e-integration-testing.md](../../.kiro/specs/features/65-e2e-integration-testing.md) — E2E/integration test hardening.
- [66-production-runbook.md](../../.kiro/specs/features/66-production-runbook.md) — Operational runbook for deploying/maintaining the app.
- [67-production-launch-checklist.md](../../.kiro/specs/features/67-production-launch-checklist.md) — Pre-launch checklist.

## Team & staff (77–83)

- [77-team-management-staff-invitations.md](../../.kiro/specs/features/77-team-management-staff-invitations.md) — Team management and staff invitations.
- [78-staff-profiles-resource-linking.md](../../.kiro/specs/features/78-staff-profiles-resource-linking.md) — Staff profiles linked to resource records.
- [79-staff-availability-time-off.md](../../.kiro/specs/features/79-staff-availability-time-off.md) — Staff availability and time-off management.
- [80-staff-my-day-operational-dashboard.md](../../.kiro/specs/features/80-staff-my-day-operational-dashboard.md) — "My Day" staff operational view.
- [81-business-notification-center.md](../../.kiro/specs/features/81-business-notification-center.md) — Business-side notification center.
- [82-business-configuration-health-center.md](../../.kiro/specs/features/82-business-configuration-health-center.md) — Setup/configuration health checks.
- [83-final-booking-operations-ux-polish.md](../../.kiro/specs/features/83-final-booking-operations-ux-polish.md) — Final booking/ops UX polish pass.

## Release candidate & lifecycle (84–88)

- [84-release-candidate-validation.md](../../.kiro/specs/features/84-release-candidate-validation.md) — RC validation report (Milestone 13.1).
- [85-e2e-fixtures.md](../../.kiro/specs/features/85-e2e-fixtures.md) — E2E fixtures and seed data.
- [86-release-candidate-testing.md](../../.kiro/specs/features/86-release-candidate-testing.md) — RC testing pass.
- [87-tenant-lifecycle-deletion-retention.md](../../.kiro/specs/features/87-tenant-lifecycle-deletion-retention.md) — Tenant lifecycle, deletion workflow, data retention policy. See also [[reports-index]] tenant-deletion investigation.
- [88-server-action-logging.md](../../.kiro/specs/features/88-server-action-logging.md) — Server action logging conventions.

## UI/UX redesign & branding (91–94)

- [91-platform-admin-ui-ux-redesign.md](../../.kiro/specs/features/91-platform-admin-ui-ux-redesign.md) — Platform admin redesign: restrained neutral surfaces.
- [92-tenant-business-ui-ux-redesign.md](../../.kiro/specs/features/92-tenant-business-ui-ux-redesign.md) — Tenant backoffice redesign: modern, warm, professional. See also [[reports-index]] premium dashboard redesign (implementation-in-progress detail).
- [93-customer-app-ui-ux-redesign.md](../../.kiro/specs/features/93-customer-app-ui-ux-redesign.md) — Customer app redesign: simple, calm, trustworthy.
- [94-tenant-branding-public-theme.md](../../.kiro/specs/features/94-tenant-branding-public-theme.md) — Per-tenant branding and public booking theme system.

## Growth features: recurring, gift cards, referrals (95–99)

- [95-recurring-appointments.md](../../.kiro/specs/features/95-recurring-appointments.md) — Recurring appointment series (Milestone 15.1).
- [96-gift-cards-stored-value.md](../../.kiro/specs/features/96-gift-cards-stored-value.md) — Gift cards / stored value (Milestone 15.2).
- [97-referrals-customer-acquisition.md](../../.kiro/specs/features/97-referrals-customer-acquisition.md) — Referral program (Milestone 15.3).
- [98-feature-completion-integration-pass.md](../../.kiro/specs/features/98-feature-completion-integration-pass.md) — Gap-closing integration pass wiring gift cards/referrals/staff routes into nav (Milestone 15.4).
- [99-final-feature-wiring-production-closure.md](../../.kiro/specs/features/99-final-feature-wiring-production-closure.md) — Final production wiring closure (Milestone 15.5).

## Marketing, segmentation, analytics, platform ops (100–109)

- [100-runtime-wiring-closure.md](../../.kiro/specs/features/100-runtime-wiring-closure.md) — Runtime call-site changes closing out recurring/gift-card wiring (Milestone 15.5.1).
- [101-customer-segmentation-marketing-foundation.md](../../.kiro/specs/features/101-customer-segmentation-marketing-foundation.md) — Customer intelligence sources and marketing foundation (Milestone 15.6).
- [102-segmentation-rule-engine-builder.md](../../.kiro/specs/features/102-segmentation-rule-engine-builder.md) — Rule-based audience segmentation with visual builder + SQL evaluation (Milestone 15.6.1).
- [103-campaigns-customer-communications.md](../../.kiro/specs/features/103-campaigns-customer-communications.md) — Email campaign composition/targeting/scheduling with consent management (Milestone 15.7).
- [104-marketing-automations-customer-journeys.md](../../.kiro/specs/features/104-marketing-automations-customer-journeys.md) — Behavior-triggered automated customer journeys (Milestone 15.8).
- [105-advanced-analytics-reporting-exports.md](../../.kiro/specs/features/105-advanced-analytics-reporting-exports.md) — Analytics/reporting layer with CSV export and saved reports (Milestone 15.9).
- [106-analytics-depth-utilization-trends.md](../../.kiro/specs/features/106-analytics-depth-utilization-trends.md) — Real utilization/trend data and detailed analytics sub-pages (Milestone 15.9.1).
- [108-platform-operations-tenant-support.md](../../.kiro/specs/features/108-platform-operations-tenant-support.md) — Platform-ops tooling: support sessions, kill switches, processor health (Milestone 15.11).
- [109-customer-booking-experience-2.md](../../.kiro/specs/features/109-customer-booking-experience-2.md) — Booking experience 2.0: recurring UI, ICS export, multi-mode payment step, no second booking engine (Milestone 15.12).

Gaps in numbering (e.g. 11–16, 42–43, 46–47, 53, 89–90, 107) mean no spec
file exists at that number — not a missing file.
