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

### Milestone 5.2 — Location Management

Replaced the locations placeholder with full CRUD location management.

**Implemented:**
- Location list with status badges, type labels, and action menus
- Create location form with auto-slug generation
- Edit location form with all fields
- Atomic primary-location switching via `set_primary_location` RPC
- Safe location deletion via `delete_business_location` RPC
- Activate/deactivate toggle (primary cannot be deactivated)
- Location slug uniqueness within tenant
- RLS policies restricting writes to owner/admin only
- Role enforcement in all Server Actions
- Delete confirmation dialog
- Formik + Yup validation
- Dashboard revalidation after mutations

**Not implemented (deferred):**
- Working hours / business hours
- Holidays and closures
- Maps / geocoding
- Resources per location
- Services per location
- Media uploads

See `docs/20-location-management.md` for full details.

### Milestone 5.3 — Location Working Hours

Implemented weekly working hours for each location.

**Implemented:**
- `location_working_hours` table (7 rows per location, unique day constraint)
- Auto-initialization trigger (default Mon–Fri 9–17, Sat 9–13, Sun closed)
- `replace_location_working_hours` RPC (atomic 7-row replacement)
- RLS policies (read: all members; write: owner/admin only via RPC)
- Reusable `features/working-hours/` module (types, schema, service, action, components)
- Weekly schedule UI with day cards, time inputs, open/closed toggle
- Convenience actions: Apply Monday to All, Apply Weekdays, Apply Weekends
- Formik + Yup validation (opens < closes, closed = null times)
- Dirty-state indicator and conditional Save button
- Working Hours link from location action menu

**Scheduling hierarchy established:**
Business → Location Working Hours → Resource Hours (future) → Service Duration (future) → Bookings (future)

**Not implemented (deferred):**
- Split shifts, lunch breaks, overnight schedules
- Holiday exceptions, seasonal hours, temporary overrides
- Resource-level schedule overrides
- Availability calculation engine

See `docs/21-working-hours.md` for full details.

### Milestone 5.4 — Location Schedule Exceptions

Implemented date-specific schedule overrides (holidays, special hours) for locations.

**Implemented:**
- `location_schedule_exceptions` table with constraints and unique(location_id, date)
- CRUD RPCs (create, update, delete) with SECURITY DEFINER + role verification
- RLS policies (read: all members; write: owner/admin)
- Updated-at trigger
- Exception list with Upcoming/Past grouping
- Create/Edit form with date picker, closed toggle, time inputs, name suggestions
- Past-date protection (no create/edit for past dates, delete allowed)
- Duplicate-date handling with safe field error
- Effective schedule preview on form
- Delete confirmation dialog
- Read-only mode for manager/staff
- Location nav integration (Schedule Exceptions menu item)

**Scheduling evaluation order documented:**
Location hours → Date exception → Resource override (future) → Service duration (future) → Bookings (future)

**Not implemented (deferred):**
- Recurring holidays, country imports
- Multiple intervals per date
- Resource-level exceptions
- Availability calculation

See `docs/22-location-schedule-exceptions.md` for full details.

### Milestone 5.5 — Resource Foundation

Introduced the generic resource model for scheduling.

**Implemented:**
- `resource_types` table (tenant-scoped categories with kinds: person, room, equipment, vehicle, other)
- `resources` table (schedulable entities with type, slug, contact info)
- `resource_locations` table (many-to-many with primary location and partial unique index)
- RPCs: `create_resource_with_locations`, `set_primary_resource_location`, `delete_resource_type`, `delete_business_resource`
- RLS policies (read: all members; write: owner/admin)
- Full CRUD UI for resource types and resources
- Location assignment with primary selection in resource form
- Slug uniqueness per tenant
- Type deletion guard (rejects if resources exist)
- Resource deletion cascades assignments

**Architecture decisions:**
- Generic model (not separate employee/room tables)
- Person resource ≠ tenant member (separate concepts)
- Resources inherit location working hours (future)
- Resource schedule overrides deferred

See `docs/23-resource-foundation.md` for full details.

### Milestone 5.6 — Business Media Foundation

Implemented a secure, reusable media system for business, location, and resource images.

**Implemented:**
- `media_assets` table with ownership model, role constraints, partial unique indexes
- `business-media` Storage bucket (public read, authenticated owner/admin write)
- Storage RLS policies enforcing tenant-scoped paths
- Upload flow: prepare (server auth + path) → upload (browser client) → complete (server metadata)
- Safe single-image replacement (logo, cover, profile) with old-image cleanup
- Gallery ordering via `reorder_media_assets` RPC
- Delete with confirmation and Storage + metadata cleanup
- `MediaUploader` and `MediaGallery` reusable components
- Routes: business media, location media, resource media
- Nav integration (Media menu item on locations and resources)
- Next.js image remote patterns for Supabase Storage

**Not implemented (deferred):**
- Public site rendering
- Image cropping/optimization
- Video/SVG/PDF uploads
- AI image generation
- CDN transformations
- Drag-and-drop
- Background orphan cleanup

See `docs/24-business-media.md` for full details.

### Milestone 6.1 — Service Categories

Implemented tenant-scoped service categories for organizing future bookable services.

**Implemented:**
- `service_categories` table with constraints, indexes, tenant-scoped slug uniqueness
- RLS policies (read: all members; write: owner/admin)
- `reorder_service_categories` RPC (atomic ordering)
- Updated-at trigger
- Full CRUD: create, edit, toggle active, delete, reorder
- Formik form with slug auto-generation
- Category list with move up/down, status toggle, delete confirmation
- Services placeholder page with link to categories
- Route pages: list, new, edit

**Not implemented (deferred to Milestone 6.2+):**
- Actual services (duration, pricing, buffers)
- Service-resource/location assignments
- Booking rules and availability
- Public booking pages

See `docs/25-service-categories.md` for full details.

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
