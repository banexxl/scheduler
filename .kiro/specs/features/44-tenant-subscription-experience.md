# Milestone 7.5 — Tenant Subscription Experience & Plan Enforcement

## Overview

This milestone introduces an application-level tenant subscription experience driven by synchronized Polar subscription data. The goal is to make plan status and feature availability understandable to the tenant while applying safe enforcement to the core creation workflows.

## Billing state model

The billing experience resolves a local application state from the synchronized subscription snapshot:

- free
- trial
- active
- grace_period
- restricted

The resolver is centralized in [features/billing/services/tenant-entitlements.ts](features/billing/services/tenant-entitlements.ts).

## Plan resolution

The tenant billing screens use the current synchronized subscription and local plan catalog to present the current plan, billing state, and visible upgrade paths. Checkout completion remains informational until webhook synchronization confirms the new state.

## Feature gating

The entitlement layer exposes the following feature checks:

- public booking
- email notifications
- appointment reminders
- customer self-service

These are used by the tenant-facing settings surfaces and are not implemented as platform-admin overrides.

## Usage limits

The initial plan-enforcement implementation covers:

- maximum locations
- maximum resources
- maximum services
- maximum team members

The current implementation uses the centralized helpers and validates usage before creating the relevant entities.

## Grace period behavior

When a tenant is in a grace period, access remains available while a warning is shown. Existing data remains intact and creation flows are only restricted when plan limits are exceeded.

## Upgrade flow

Upgrade actions continue to rely on Polar-hosted checkout. Subscription activation remains webhook-driven.

## Server helpers

The centralized helpers include:

- hasFeature()
- getLimit()
- assertWithinLimit()
- resolveBillingState()

## Actions and routes

The initial enforcement is wired into the server actions for the relevant creation flows:

- location creation
- resource creation
- service creation

Tenant billing routes updated for this milestone:

- /{tenantSlug}/settings/billing
- /{tenantSlug}/settings/billing/plans
- /{tenantSlug}/settings/public-booking
- /{tenantSlug}/settings/notifications

## Manual deployment

1. Apply the corresponding migration.
2. Regenerate database types.
3. Configure plan entitlements.
4. Verify the billing experience and limit enforcement.

## Verification

The current implementation has been validated with the local editor diagnostics and a targeted regression test suite for the entitlement helpers.
