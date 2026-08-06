# Business Onboarding

## Overview

The business onboarding flow guides new authenticated users through creating their business on the platform. The form collects the minimum required information and validates it client-side before submission.

**Current status:** Milestone 4.4 is complete. The form validates locally, confirms slug availability with the server, and creates the business via the `create_tenant` RPC. On success, the user is redirected to their new business dashboard.

## Route

```
/create-business
```

### Access Control

| User Type | Behavior |
|-----------|----------|
| Anonymous | Redirect to `/login` |
| Active tenant member | Redirect to `/${tenantSlug}/dashboard` |
| Platform admin | Allowed |
| Customer-only user | Allowed |
| New user (no relationships) | Allowed |

## Form Fields

| Field | Required | Default | Validation |
|-------|----------|---------|------------|
| Business Name | Yes | — | Trimmed, 2–120 characters |
| Business Address (slug) | Yes | Auto-generated from name | Trimmed, lowercase, 3–63 chars, `[a-z][a-z0-9-]*[a-z0-9]`, no repeated hyphens, not reserved |
| Primary Location Name | Yes | "Main Location" | Trimmed, 2–120 characters |
| Timezone | Yes | Browser-detected | IANA format (e.g. `Europe/Belgrade`) |
| Currency | Yes | Locale-detected | 3-letter code from supported list |

### Fields NOT included (deferred)

- Language, theme, dark mode
- Logo upload, business category
- Address, phone, email, description

## Slug Generation

Utility: `lib/tenants/generate-tenant-slug.ts`

Rules:
1. Trim whitespace
2. Convert to lowercase
3. Normalize Unicode (NFD), remove diacritics
4. Handle special characters: ø→o, æ→ae, ß→ss, đ→dj
5. Remove apostrophes
6. Replace spaces/separators with hyphens
7. Remove unsupported characters (only a-z, 0-9, hyphen allowed)
8. Collapse repeated hyphens
9. Remove leading/trailing hyphens
10. Limit to 63 characters
11. Remove trailing hyphen after truncation

Examples:
- "John's Barbershop" → `johns-barbershop`
- "Bella Beauty Studio" → `bella-beauty-studio`
- "Željko Salon" → `zeljko-salon`

### Auto-slug Behavior

1. User types business name → slug updates automatically
2. User manually edits slug → auto-generation stops
3. User clicks "Reset suggestion" → slug regenerates from current name, auto-generation resumes

## Reserved Slugs

Source: `lib/constants/reserved-slugs.ts`

Reserved slugs are rejected with the message: "This address is reserved. Choose another one."

The validation uses the shared `isReservedSlug()` helper. The reserved list includes system routes like `admin`, `api`, `login`, `platform`, `dashboard`, etc.

## Timezone Detection

Helper: `lib/helpers/get-browser-timezone.ts`

- Uses `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Fallback: `Europe/Belgrade`
- The detected timezone is always included in the selectable list
- A curated list of ~55 common timezones is provided, grouped by region

## Currency Detection

Helper: `features/business/utils/get-default-currency.ts`

Locale-based mapping:
- `sr-*` → RSD
- `ro-*` → RON
- `bg-*` → BGN
- `en-US` → USD
- `en-GB` → GBP
- `en-AU` → AUD
- `en-CA` → CAD
- `*-CH` → CHF
- Otherwise → EUR

Supported currencies: AUD, BGN, CAD, CHF, EUR, GBP, RON, RSD, USD

## URL Previews

The form displays live URL previews:

- **Public site:** `{protocol}://{slug}.{rootDomain}`
- **Dashboard:** `{appUrl}/{slug}/dashboard`

In development:
- `http://johns-barbershop.localhost:3000`
- `http://localhost:3000/johns-barbershop/dashboard`

URLs use environment variables (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ROOT_DOMAIN`).

## Normalized Output

On successful validation, the form produces:

```json
{
  "businessName": "John's Barbershop",
  "tenantSlug": "johns-barbershop",
  "primaryLocationName": "Main Location",
  "primaryLocationSlug": "main-location",
  "timezone": "Europe/Belgrade",
  "currency": "RSD"
}
```

The `primaryLocationSlug` is derived from `primaryLocationName` using the same slug generator. If the location name is "Main Location", the slug is `main-location`.

## File Structure

```
features/business/
├── components/
│   ├── create-business-form.tsx    — Main form (Client Component)
│   └── business-url-preview.tsx    — URL preview panel
├── schemas/
│   └── create-business-schema.ts   — Yup validation schema
└── utils/
    ├── get-default-currency.ts     — Locale-based currency detection
    ├── supported-currencies.ts     — Currency list and codes
    └── timezone-list.ts            — Curated timezone options

lib/tenants/
└── generate-tenant-slug.ts         — Reusable slug generation utility

lib/helpers/
└── get-browser-timezone.ts         — Browser timezone detection
```

## Technology

- Formik with Yup `validationSchema`
- Yup validation schemas
- MUI components (TextField, MenuItem, Button, etc.)
- No external geolocation or timezone APIs

## Slug Availability Checking (Milestone 4.3)

### Architecture

```
Browser (Formik form)
  → useBusinessSlugAvailability hook (debounce 400ms)
    → GET /api/businesses/slug-availability?slug=...
      → checkBusinessSlugAvailability (server service)
        → supabase.rpc('is_tenant_slug_available', { candidate_slug })
          → PostgreSQL function (SECURITY DEFINER)
```

### Why not query tenants directly?

The browser client cannot read all tenant slugs due to RLS policies. Rather than weakening RLS, a narrowly scoped `SECURITY DEFINER` function returns only a boolean — never exposing tenant names, IDs, statuses, or ownership.

### Database RPC: `is_tenant_slug_available`

- Normalizes input (trim + lowercase)
- Validates format (3–63 chars, `^[a-z][a-z0-9-]*[a-z0-9]$`, no repeated hyphens)
- Returns `false` for invalid format
- Checks `public.tenants` for existing slug (any status = unavailable)
- Returns only `boolean`
- `SECURITY DEFINER` with empty `search_path`
- Restricted to `authenticated` role only

### Client Behavior

- Debounces availability requests by 400ms
- Cancels stale requests via AbortController
- Does not request for locally invalid or reserved slugs
- Resets state when slug changes
- Avoids duplicate requests for unchanged slugs
- Status states: idle, invalid, checking, available, unavailable, error

### Submission Eligibility

The form submit button is disabled unless:
1. All Yup validation passes
2. The current slug is confirmed available by the server
3. The confirmed slug matches the current field value
4. No availability request is pending

If the user edits the slug after confirmation, the available state clears immediately and a new check is required.

### Race Conditions

The live availability check is **advisory only**. Another user may take the same slug between check and submission. The database unique index on `tenants.slug` is the final authority. If a race condition causes a duplicate, the server action returns a safe field error: "This business address was just taken. Choose another one."

### Shared Slug Validation Utilities

Located in `lib/tenants/validate-tenant-slug.ts`:

- `normalizeTenantSlug(slug)` — trim + lowercase
- `isValidTenantSlugFormat(slug)` — format check (3–63, regex, no double hyphens)
- `isReservedTenantSlug(slug)` — checks against reserved slug set
- `validateTenantSlugLocally(slug)` — full local validation, returns error message or null

Used by: Yup schema, server availability service, client hook, server action.

## Business Creation (Milestone 4.4)

### Server Action

`features/business/actions/create-business.ts`

Steps:
1. Require authenticated user
2. Validate all fields with canonical Yup schema (server-side)
3. Check user doesn't already have an active tenant membership
4. Revalidate slug: format, reserved, availability (via `is_tenant_slug_available` RPC)
5. Resolve active subscription plan (annual preferred, fallback any active)
6. Call `create_tenant` RPC with normalized values
7. Handle duplicate-slug race condition (unique index violation → field error)
8. Redirect to `/${tenantSlug}/dashboard`

### What the RPC Creates Atomically

- `tenants` record
- `tenant_members` record (owner role, active status)
- `locations` record (primary location)
- `tenant_subscriptions` record (with plan and trial)
- `audit_logs` entry (action: `tenant.created`)

If any operation fails, the entire transaction rolls back. No partial data.

### Why Not the Admin Client

The `create_tenant` RPC uses `auth.uid()` internally to create the owner relationship. Using the service-role client would remove the authenticated user context and could cause incorrect ownership. The normal authenticated server client is always used.

### Existing-Membership Prevention

Before calling the RPC, the action queries `tenant_members` for the authenticated user. If an active membership with an active tenant exists, the action redirects to that business's dashboard without calling the RPC.

This is application-level enforcement. Stronger RPC-level enforcement may be added in a future milestone.

### Subscription Plan Resolution

The action queries `subscription_plans` for an active annual plan. If none exists, it falls back to any active plan. If no active plan exists at all, it returns a safe error without creating the tenant.

Default trial duration: 14 days.

### Error Handling

| Scenario | Response |
|----------|----------|
| Authentication lost | Safe auth error message |
| Invalid form data | Field-level errors from Yup |
| Reserved slug | Slug field error, no RPC call |
| Unavailable slug (recheck) | Slug field error, no RPC call |
| Duplicate slug (race condition) | Slug field error: "just taken" |
| Missing subscription plan | General configuration error |
| Unexpected RPC failure | General retry message |

### Formik Integration

- Uses `useTransition` for pending state
- Server action called with plain serializable values
- Action errors displayed as field-level or general alerts
- Slug field errors cleared when user edits the slug
- Submit disabled during pending transition
- On success, server action redirects (no client-side navigation)

## Next Steps (Milestone 4.5+)

- Business dashboard with real data
- Team management
- Additional locations
- Payment integration
