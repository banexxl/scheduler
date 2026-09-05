# Milestone 8.1 — Business Onboarding Wizard

## Goals

- Guide a newly created tenant through the minimum setup required to start accepting appointments.
- Reuse existing business settings, location, resource, service, working-hours, booking-rules, and public-booking features instead of creating parallel domain logic.
- Keep onboarding resumable and derived from actual tenant data.

## Step model

Onboarding uses the stable step keys:

- business_details
- location
- resource
- service
- working_hours
- booking_rules
- public_booking
- complete

## Persisted onboarding state

A dedicated table, tenant_onboarding, stores the current navigation step and status. The completion state is derived from actual tenant data and the persisted step is treated as navigation state only.

## Derived completion logic

The resolver calculates completion from the configured tenant data. The wizard will not rely on the stored current_step alone.

## Tenant creation integration

The create-business flow redirects new tenants to the onboarding route after the tenant is created.

## Legacy tenant behavior

Existing tenants without an onboarding row are treated as eligible for onboarding. The progress resolver derives their readiness from actual configuration.

## Plan-aware behavior

Public booking is considered optional when plan support is unavailable. The onboarding wizard does not force checkout.

## Route architecture

- app/(business)/[tenantSlug]/onboarding/page.tsx: server component and access control
- app/(business)/[tenantSlug]/onboarding/client-page.tsx: client-side wizard UI

## Dashboard checklist

The dashboard surfaces a simple checklist that links back to onboarding and reflects progress from the derived resolver.
