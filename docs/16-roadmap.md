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

### Milestone 4.5 — First Real Business Dashboard

Replaced the placeholder dashboard with a server-rendered business overview.

**Implemented:**
- Dashboard service with parallel database queries
- Business header (name, status, role, public URL preview)
- Stat cards (locations, team members, customers, subscription status)
- Primary location detail card with empty state
- Subscription summary card with plan, dates, cancellation status
- Getting started section with next-action links
- Status label and date formatting utilities
- Proper missing-data handling (no crashes on null data)
- All queries via authenticated server client with RLS

**Not implemented (deferred to future milestones):**
- Scheduling, services, resources, appointments
- Charts, analytics history
- Reviews, themes, uploads
- Payment checkout
- Notifications

See `docs/18-business-dashboard.md` for full details.

### Milestone 5.1 — Business Settings

Implemented the business settings page with editable form for authorized roles.

**Implemented:**
- Database migration: `description`, `website_url`, `default_language`, `social_links` columns
- Settings service loading current values
- Yup validation schema (name, email, phone, timezone, currency, description, URL, language, social links)
- Server Action with owner/admin role enforcement and explicit update payload
- Formik form with all field sections
- Read-only mode for manager/staff with clear notice
- URL validation (HTTP/HTTPS only, rejects javascript: and protocol-relative)
- Social links stored as JSONB, validated per-platform
- Slug displayed read-only with URL preview
- Dirty-state indicator and conditional save button
- Character counter for description

**Not implemented (deferred):**
- Slug change flow
- Logo upload
- Audit logging of settings changes
- Browser navigation blocking for unsaved changes

See `docs/19-business-settings.md` for full details.

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
