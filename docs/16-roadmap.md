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

### Milestone 6.2 — Service Foundation

Implemented the core service entity for the scheduling application.

**Implemented:**
- `services` table with duration, price, currency, buffers, category FK
- Tenant-category ownership trigger (prevents cross-tenant category refs)
- RLS policies (read: all members; write: owner/admin)
- `reorder_services` RPC (category-scoped atomic ordering)
- Full CRUD: create, edit, toggle active, delete, reorder
- Formik form with slug auto-gen, category selector, duration/price/buffer fields
- Service list with category chips, duration/price display, action menus
- Routes: list, new, edit (replaces services placeholder)

**Not implemented (deferred):**
- Service-resource/location assignments
- Availability calculations
- Booking rules and appointments
- Public booking pages
- Packages, payments, notifications

See `docs/26-services.md` for full details.

### Milestone 6.3 — Service Location Assignments

Implemented tenant-safe assignments between services and business locations.

**Implemented:**
- `service_locations` junction table with constraints, indexes, unique (tenant_id, service_id, location_id)
- Tenant-consistency trigger (validates service and location belong to same tenant on insert/update)
- RLS policies (read: all members; write: owner/admin)
- `set_service_locations` RPC (atomic sync: replaces full location set for a service)
- `reorder_service_locations` RPC (atomic location-specific ordering)
- Updated-at trigger (shared function)
- Domain types, Yup validation schema
- Query services (locations for service, services for location, counts, existence check)
- Server action using atomic RPC
- Service form: location picker (multi-select checkboxes) in create and edit modes
- Service list: shows assigned location names or count
- Location edit page: read-only assigned services section with links
- Combined create action (service + locations atomically before redirect)
- CASCADE deletion on service/location/tenant delete

**Active-state semantics:**
- Assignment usable when: service active AND location active AND assignment active
- Assignment `is_active` exists but not toggled separately in current UI

**Not implemented (deferred):**
- Service-to-resource assignments
- Location-specific pricing, duration, or buffers
- Resource availability or scheduling
- Booking rules, appointments, public pages
- Drag-and-drop reordering UI
- Assignment-level active toggle UI

See `docs/27-service-locations.md` for full details.

### Milestone 6.4 — Service Resource Assignments

Implemented tenant-safe assignments between services and resources with optional overrides.

**Implemented:**
- `service_resources` junction table with constraints, indexes, unique (tenant_id, service_id, resource_id)
- Override columns: duration, price, currency, buffer_before, buffer_after (all nullable)
- Currency-requires-price constraint
- Tenant-consistency trigger (validates service and resource belong to same tenant)
- RLS policies (read: all members; write: owner/admin)
- `set_service_resources` RPC (atomic JSONB-based sync with upsert)
- `reorder_service_resources` RPC (atomic service-scoped ordering)
- `create_service_with_assignments` RPC (atomic service + locations + resources in one transaction)
- Domain types, Yup validation schemas
- Resolution utility (`resolveServiceResourceValues`) using nullish coalescing
- Query services (resources for service, services for resource, counts)
- Server actions using atomic RPCs
- Service form: resource picker with collapsible override fields
- Service list: shows assigned resource names or count
- Resource edit page: read-only assigned services with resolved values
- CASCADE deletion on service/resource/tenant delete

**Override semantics:**
- null = use service default
- explicit 0 = valid override (free price, no buffer)
- Currency override requires price override

**Not implemented (deferred):**
- Resource schedules or availability
- Location-resource-service compatibility triples
- Booking rules, appointments, public pages
- Drag-and-drop reordering UI
- Calendar, payments, notifications

See `docs/28-service-resources.md` for full details.

### Milestone 6.5 — Resource Working Hours and Time Off

Implemented recurring weekly working hours and date-specific time off for resources.

**Implemented:**
- `resource_working_hours` table with day_of_week (ISO 1-7), time ranges, location scope
- `resource_time_off` table with timestamptz half-open intervals, full-day support
- Overlap prevention triggers (concurrency-safe, per resource+day+location for working hours; global-blocks-specific for time off)
- Tenant-consistency triggers on both tables
- RLS policies (read: all members; write: owner/admin)
- `set_resource_working_hours` RPC (atomic JSONB-based schedule replacement with overlap validation)
- `create_resource_time_off`, `update_resource_time_off`, `delete_resource_time_off` RPCs
- Domain types with ISO day constants and labels
- Yup validation schemas with overlap detection and cross-field checks
- Query services (weekly schedule, time-off by range/future/id)
- Server actions for schedule save and time-off CRUD
- Weekly schedule editor component (7-day view, add/remove periods, location selector)
- Time-off list and form components (full-day toggle, date/time inputs)
- Resource edit page extended with Working Hours, Time Off, and Assigned Services sections
- Time-off create/edit route pages
- CASCADE deletion on resource/location/tenant delete

**Scheduling model:**
- Times in tenant-local wall clock (not UTC)
- No overnight periods (start < end enforced)
- Split shifts supported via multiple periods
- Half-open interval for time off: [starts_at, ends_at)
- Full-day: midnight to next midnight (exclusive end)

**Not implemented (deferred):**
- Availability calculations
- Time-slot generation
- Appointment creation or management
- Calendar UI
- Booking rules
- Public booking pages
- External calendar sync
- Overnight shift support

See `docs/29-resource-schedules.md` for full details.

### Milestone 6.6 — Location Business Hours and Closures

Implemented recurring weekly business hours and date-specific closures/custom hours for locations.

**Implemented:**
- `location_business_hours` table with day 1–7 ISO, time ranges, overlap prevention
- `location_schedule_exceptions_v2` table with date, type (closed/custom_hours), unique per location+date
- `location_exception_periods` table with custom opening times for custom_hours exceptions
- Tenant-consistency triggers on all tables
- Overlap triggers (recurring hours per location+day; exception periods within exception)
- Type-enforcement trigger (periods only for custom_hours)
- RLS policies (read: all members; write: owner/admin) on all 3 tables
- `set_location_business_hours` RPC (atomic weekly schedule replacement)
- `create_location_exception_v2`, `update_location_exception_v2`, `delete_location_exception_v2` RPCs
- Shared scheduling utilities (`lib/scheduling/scheduling-constants.ts`)
- Domain types, Yup validation schemas with overlap detection
- Query services (business hours, exceptions with periods)
- Resolution utility (`resolveLocationOperatingPeriods`) — exception replaces weekly hours
- Server actions for business hours save and exception CRUD
- Weekly business-hours editor component (7-day view)
- Schedule exception list and form components (closed/custom_hours with period editor)
- Location edit page extended with Business Hours, Exceptions, and Assigned Services sections
- Exception create/edit route pages
- CASCADE deletion on location/tenant delete

**Exception model:**
- `closed`: location fully closed for that date
- `custom_hours`: custom periods replace normal weekly hours
- One exception per location per date (unique constraint)

**Not implemented (deferred):**
- Availability calculations
- Resource/location hours intersection
- Time-slot generation
- Booking rules, appointments
- Calendar UI, public pages
- Business-wide holiday templates
- External calendar sync

See `docs/30-location-business-hours.md` for full details.

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

### Milestone 6.12 — Appointment Notifications Foundation

Implemented transactional email notifications for appointment events using an outbox pattern.

**Implemented:**
- `tenant_notification_settings` table with per-event toggles, sender identity
- `notification_templates` table with 3 types (created, rescheduled, cancelled)
- `notification_outbox` table with idempotency, retry, locking, rendered snapshots
- `notification_deliveries` table with per-attempt records
- Constraints, indexes, triggers, RLS policies on all 4 tables
- 5 SECURITY DEFINER RPCs (enqueue, claim_batch, mark_sent, mark_failed, retry)
- Email provider abstraction (interface + console + nodemailer implementations)
- Template renderer (variable substitution, HTML escaping, plain-text generation)
- Default templates for all 3 event types
- Template variable validation (13 supported variables)
- Settings resolution with defaults and tenant name fallback
- Enqueue service with settings checks, template rendering, idempotency
- Integration into appointment creation, rescheduling, and cancellation actions
- Integration into public booking creation action
- Notification processing service with batch claiming and delivery recording
- Protected processing route (POST /api/internal/notifications/process)
- Notification settings UI (/{tenantSlug}/settings/notifications)
- Template management UI with preview and reset-to-default
- Appointment detail notification section with status display
- Manual retry action for failed notifications
- Public booking confirmation conditional email message
- 59 automated tests (schemas, types, template renderer, console provider)
- Full documentation (docs/36-appointment-notifications.md)

**Not implemented (deferred):**
- SMS, WhatsApp, push notifications
- Marketing emails, newsletters, reminders
- Payment receipts, customer accounts
- Calendar attachments, external calendar sync
- Provider delivery webhooks (bounce/delivered/opened)
- Bulk messaging, notification campaigns

See `docs/36-appointment-notifications.md` for full details.
