# Customer Favorites & Rebooking

**Milestone 9.3**

## Overview

Convenience features for returning customers: favorite businesses/services/resources, recent booking shortcuts, and improved book-again flows with revalidation.

## Favorite Model

Three tables: `customer_favorite_tenants`, `customer_favorite_services`, `customer_favorite_resources`. All keyed to `customer_account_id` (global account). Unique per account+entity.

## Eligibility

- Business: must have active account link
- Service: must belong to linked tenant
- Resource: must belong to linked tenant + be publicly visible
- Revoked link: favorites hidden from UI but may remain stored for relinking

## RLS

Customer reads/writes only own favorites (`customer_account_id` resolved via auth.uid()). No cross-account access. Businesses cannot see customer favorites.

## Tenant Consistency

Triggers verify: service belongs to tenant, resource belongs to tenant. Cross-tenant favorites rejected at DB level.

## Toggle Actions

`toggleFavoriteBusinessAction`, `toggleFavoriteServiceAction`, `toggleFavoriteResourceAction` — all verify active link before insert/delete. Idempotent (upsert on add, delete on remove).

## Recent Bookings

Derived from recent completed appointments. Deduplicated by tenant+service+location combination. Shows last 3–5 unique shortcuts.

## Book Again

From completed appointment: carries safe context (tenant slug, service slug, location slug). Always uses current live availability. Revalidates: service active, location active, resource active/public. Fallback to "no preference" if resource unavailable.

## Quick Book

Known context → skip resolved steps in booking flow. Service+location known → start at date/time. Service only → start at location. Never bypasses review/confirmation.

## Disconnect Behavior

Favorites filtered through active links. Disconnecting hides favorites from UI. Relinking may restore them.

## Privacy

Favorites are customer-private. Businesses never see "customer favorited you." Not used for marketing tracking.

## Files Created

```
supabase/migrations/20250805000033_customer_favorites.sql
features/customer-account/types/customer-favorites.ts
features/customer-account/actions/favorite-actions.ts
features/customer-account/__tests__/customer-favorites.test.ts
docs/58-customer-favorites-rebooking.md
```

## Assumptions

- Active tenant link required for all favorites
- Service/resource visibility follows tenant booking settings
- No marketplace discovery through favorites
- Guest flows unaffected
