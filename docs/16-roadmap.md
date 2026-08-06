# Roadmap

## Completed

### Milestone 4.1 — Onboarding Redirect Logic

Updated post-authentication routing so new users are directed to business creation.

**Destination precedence:**
1. Platform admin → `/platform/dashboard`
2. Active tenant member → `/[tenantSlug]/dashboard`
3. Customer-only user → `/account`
4. New user (no relationships) → `/create-business`

`/create-business` is a protected placeholder. The actual onboarding form is implemented in Milestone 4.2.

### Milestone 4.2 — Business Creation Form UI

Built the complete business creation form with client-side validation.

**Implemented:**
- Business name and slug fields with auto-generation
- Primary location name with default value
- Timezone detection (browser Intl API) with curated selectable list
- Currency detection (browser locale) with supported currency list
- Live URL preview (public site + dashboard)
- Yup validation schema with reserved-slug rejection
- Formik with MUI components
- Responsive, accessible layout

**Not implemented (deferred to Milestone 4.3+):**
- `create_tenant()` RPC call
- Slug availability database check
- Actual business/tenant record creation

See `docs/17-business-onboarding.md` for full details.

### Milestone 4.3 — Business Slug Availability

Implemented secure, live tenant-slug availability checking.

**Implemented:**
- Database RPC `is_tenant_slug_available()` (SECURITY DEFINER, authenticated-only)
- Server-side availability service with format + reserved + DB check
- Authenticated API endpoint `GET /api/businesses/slug-availability?slug=...`
- Client hook with 400ms debounce, AbortController, stale-request cancellation
- Form integration with status indicators (checking/available/unavailable/error)
- Submission blocked until slug confirmed available
- Shared slug validation utilities (normalize, format check, reserved check)
- No tenant data exposed; only boolean availability returned

**Not implemented (deferred to Milestone 4.4+):**
- `create_tenant()` RPC call
- Actual business/tenant record creation
- Race-condition handling at submission time (unique index is final authority)

### Milestone 4.4 — Business Creation and create_tenant Integration

Connected the business creation form to the `create_tenant` database RPC.

**Implemented:**
- Server Action (`features/business/actions/create-business.ts`)
- Server-side Yup validation (same canonical schema as browser)
- Existing-membership prevention (query before RPC)
- Final slug recheck via `is_tenant_slug_available` before creation
- Subscription plan resolution (active annual preferred, fallback any active)
- `create_tenant` RPC call via authenticated server client (never admin)
- Duplicate-slug race-condition error mapping (unique index → field error)
- Primary location slug generated server-side
- Redirect to `/${tenantSlug}/dashboard` after success
- Cache invalidation for `/create-business` and `/${tenantSlug}`
- Formik integration with `useTransition`, action errors, and field errors
- 14-day default trial

**Atomic RPC creates:**
- Tenant record
- Owner `tenant_members` relationship
- Primary location
- Tenant subscription
- Audit log entry

**Not implemented (deferred):**
- Dashboard analytics or scheduling features (Milestone 4.5+)
- Payment checkout
- Team invitations
- Additional location management
- Stronger RPC-level enforcement of one-business-per-owner

## Planned

- Foundation
- Services
- Resources
- Availability
- Booking Engine
- Reviews
- Themes
- Payments
- Analytics
- AI Assistant
