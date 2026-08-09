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

### Milestone 8.1 — Business Onboarding Wizard

Implemented a guided onboarding flow for newly created businesses that reuses existing settings, location, resource, service, booking-rules, and public-booking primitives.

**Implemented:**
- Dedicated onboarding state table and server-side state helpers
- Derived onboarding progress resolver from actual tenant data
- New onboarding route under /[tenantSlug]/onboarding with server/client separation
- Dashboard checklist and progress summary for incomplete setup
- Tenant creation redirect into onboarding
- Documentation summary in docs/45-business-onboarding.md

**Not implemented (deferred):**
- Full multi-step form UI for every domain object with full editing controls
- Advanced plan-gated feature enforcement beyond the existing domain action guards

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

### Milestone 6.14 - Secure Customer Appointment Self-Service

Implemented secure tokenized guest management for single appointments.

**Implemented:**
- Migration `20250805000019_appointment_self_service.sql`
- Appointment access tokens with hash + authenticated encryption metadata
- Token rotation RPC, revocation support, expiry policy, tenant trigger validation
- Customer action log and idempotent customer request table
- Public route `/manage-appointment/[token]`
- Public appointment projection with safe fields only
- Customer cancellation and rescheduling actions by token
- Availability exclusion for the appointment being rescheduled
- Rate limiting buckets for page/availability/mutation actions
- Token usage tracking (last_used_at, use_count)
- Generic unavailable behavior for invalid/expired/revoked states
- Internal appointment detail section for link lifecycle and action history
- Appointment creation best-effort token generation for email-backed bookings
- Security headers for token route (noindex/nofollow/no-store/no-referrer)
- Milestone documentation in `docs/38-customer-appointment-self-service.md`

**Current constraints:**
- Notification/reminder queue transport is not yet implemented; side-effect hooks are explicit safe stubs.
- Public self-service supports fixed service/location scope during rescheduling.

See `docs/38-customer-appointment-self-service.md` for full details.
Rollout checklist: `docs/39-self-service-rollout-checklist.md`.

### Milestone 7.1 - Polar Foundation, Products, Prices, and Webhook Ingestion

Implemented the billing catalog and webhook ingestion foundation for Polar integration.

**Implemented:**
- Migration `20250805000020_polar_foundation.sql`
- `billing_plans` with stable local keys (`free`, `starter`, `professional`, `business`)
- `billing_plan_prices` synchronized from Polar prices
- `billing_webhook_events` durable event inbox with unique `polar_event_id`
- `billing_sync_runs` diagnostics table for sync/reconciliation outcomes
- `claim_billing_webhook_events` RPC with `FOR UPDATE SKIP LOCKED` + stale lock recovery
- Server-only Polar config/client modules
- Product sync service with:
	- mapping via `polar_product_id` or metadata plan key
	- event-order protection via `polar_modified_at`
	- archive of missing local prices
	- checkout-eligibility classification
- Webhook ingestion route: `POST /api/webhooks/polar`
- Internal processing route: `POST /api/internal/billing/process-webhooks`
- Internal sync routes:
	- `POST /api/internal/billing/sync-products`
	- `POST /api/internal/billing/reconcile-products`
- Platform admin actions:
	- `mapPolarProductToPlanAction`
	- `refreshPolarProductsAction`
- Platform diagnostics page: `/platform/billing/products`

**Not implemented (deferred):**
- Checkout session creation
- Subscription lifecycle writes (upgrade/downgrade/cancel)
- Payment/invoice reconciliation
- Entitlements enforcement and feature gating

See `docs/40-polar-foundation-products-prices.md` for full details.

### Milestone 7.2 - Platform Admin Billing Catalog, Polar Checkout, and Billing Customers

Implemented the first functional billing-admin and tenant checkout foundation on top of Milestone 7.1.

### Milestone 7.3 - Subscription Lifecycle Projection and Tenant Billing Foundation

Implemented the synchronized subscription projection layer and the initial tenant billing surfaces.

**Implemented:**
- Migration `20250805000022_polar_subscriptions.sql`
- `tenant_subscriptions` projection table with lifecycle, access-state, and sync tracking
- Billing subscription state history for webhook-driven transitions
- Tenant billing overview and plan-selection routes
- Initial subscription-aware dashboard wiring for business tenants

**Not implemented (deferred):**
- Full entitlement enforcement
- Feature gating and plan-limit enforcement
- Tenant-specific billing dashboard experience

### Milestone 7.4 - Orders, Refunds, and Billing History

Implemented local projection tables and tenant/platform surfaces for financial history.

**Implemented:**
- Migration `20250805000023_polar_orders_refunds.sql`
- `billing_orders` and `billing_refunds` projection tables
- Tenant billing history view and platform billing order/refund pages
- Webhook routing for orders and refunds
- Financial counters on the platform dashboard

**Not implemented (deferred):**
- Deep reconciliation workflows
- Full admin detail views
- Production payload validation against real Polar data

### Milestone 7.5 - Tenant Subscription Experience & Plan Enforcement

Implemented the tenant billing experience foundation with centralized entitlement helpers and initial plan-limit enforcement.

**Implemented:**
- Centralized billing entitlement resolver and billing-state model
- Tenant billing plans and billing overview improvements
- Initial enforcement for location/resource/service creation based on effective plan limits
- Feature gating helpers for public booking, notifications, reminders, and self-service
- Regression tests for billing-state mapping and limit checks
- Milestone documentation in `docs/44-tenant-subscription-experience.md`

**Not implemented (deferred):**
- Platform-admin entitlement editor
- Revenue analytics and metered billing
- Full UI rollout for all restricted actions across every route
- Real production validation against live Polar subscription payloads

**Implemented:**
- Migration `20250805000021_polar_checkout_customers.sql`
- `tenant_billing_customers` table with trusted `external_id` strategy (`tenant:{tenantId}`)
- `billing_checkout_sessions` table with idempotent `UNIQUE (tenant_id, request_key)`
- Checkout consistency trigger for:
	- plan-price relationship
	- price-product relationship
	- owner/admin requester membership
	- callback URL shape and external customer id format
- RLS policies for tenant owner/admin read access and no direct client writes
- Platform admin shell components and billing navigation
- Platform billing routes:
	- `/platform/billing`
	- `/platform/billing/plans`
	- `/platform/billing/products`
	- `/platform/billing/webhooks`
- Plan admin actions:
	- create/update/toggle active/toggle public/reorder
	- webhook retry (failed-only)
	- product sync controls (single/all)
- Polar product discovery projection for mapping diagnostics
- Tenant billing routes:
	- `/{tenantSlug}/settings/billing`
	- `/{tenantSlug}/settings/billing/plans`
	- `/{tenantSlug}/settings/billing/return`
- Hosted checkout creation service + tenant action
- Customer portal session creation service + tenant action
- Webhook processor extensions:
	- checkout events (`checkout.created`, `checkout.updated`, `checkout.expired`)
	- customer events (`customer.created`, `customer.updated`, `customer.deleted`, `customer.state_changed`)

**Deliberately not implemented:**
- Subscription activation/entitlements
- Subscription lifecycle projection
- Orders/payment history/refunds
- Usage and plan-limit enforcement
- Appointment payment handling

See `docs/41-platform-admin-polar-checkout-customers.md` for full details.

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

### Milestone 6.13 — Appointment Reminder Scheduling

Implemented scheduled email reminders sent before appointments using the existing notification outbox infrastructure.

**Implemented:**
- `schedule_version` column on appointments with auto-increment trigger
- `tenant_reminder_rules` table with configurable offsets (5 min – 365 days)
- `appointment_reminders` table with version-based uniqueness
- Extended notification event/template types with `appointment_reminder`
- `sync_appointment_reminders` RPC (atomic create/update/cancel per rules)
- `claim_due_appointment_reminders` RPC (SKIP LOCKED with eligibility check)
- `cancel_pending_appointment_reminder_notifications` RPC
- `backfill_appointment_reminders` RPC (90-day max, 500 batch)
- Schedule version auto-increment trigger on scheduling field changes
- Tenant-consistency trigger for reminder records
- Reminder rule CRUD service and server actions
- Reminder synchronization service integrated into create/reschedule/cancel
- Reminder processing service (scheduler → outbox pipeline)
- Protected reminder processing route (POST /api/internal/reminders/process)
- Sent-state synchronization (outbox sent → reminder sent)
- Reminder settings UI with rules table, add/edit/delete, presets
- Appointment detail reminders section with manual sync action
- Default `appointment_reminder` email template with `{{reminder_offset}}` variable
- Public booking confirmation conditional reminder wording
- 53 automated tests (types, template rendering, schema validation)
- Full documentation (docs/37-appointment-reminders.md)

**Not implemented (deferred):**
- SMS reminders
- Push notifications
- Customer self-service (cancel/reschedule links)
- Recurring appointments
- Provider delivery webhooks

See `docs/37-appointment-reminders.md` for full details.

### Milestone 8.4 — Business Dashboard & Analytics

Implemented a tenant dashboard with operational metrics and business insights.

**Implemented:**
- Analytics query orchestrator with period/comparison resolution
- Date range model (today/7days/this_month/prev_month) using tenant timezone
- Summary cards: today operations + period metrics + comparison deltas
- Appointment trend SVG line chart (total/completed/cancelled)
- Top services ranking (bookings, completed, value)
- Resource analytics (appointment count, scheduled minutes)
- Location breakdown (multi-location support)
- Customer metrics (new vs returning, return rate)
- Booking source breakdown (internal/public/walk-in/phone)
- Status breakdown with colored progress bars
- Comparison period with percentage/percentage-point changes
- Server/client architecture (page.tsx → client-page.tsx)
- URL-based period filter
- Empty state handling for all components
- 15 automated tests for date ranges and constants
- Documentation (docs/48-business-dashboard-analytics.md)

**Not implemented (deferred):**
- Platform-admin analytics, MRR/ARR
- Appointment payment revenue
- Resource utilization (working-hour intersection)
- CSV exports, scheduled reports
- Forecasting, AI insights

See `docs/48-business-dashboard-analytics.md` for full details.

### Milestone 8.5 — Public Booking UX & Branding Polish

Polished the public booking flow into a premium mobile-first customer experience.

**Implemented:**
- PublicBookingShell with branded hero header, MUI Stepper, responsive layout
- Enhanced service discovery with category chips, search, polished cards
- Improved location cards with auto-select, skeleton loading, empty states
- Horizontal date strip with week navigation and "Next available" shortcut
- Time slots grouped by morning/afternoon/evening with stale-request handling
- Customer form with autofill attributes, mobile keyboards, inline validation, privacy notice
- Enhanced confirmation with appointment number card, email/reminder notice, book-another
- Consistent public-safe error/empty/loading states (no technical wording)
- Booking link preview/copy and preview action on settings page
- Full documentation (docs/49-public-booking-ux-branding.md)

**Not implemented (deferred):**
- Customer accounts, ICS generation, appointment payments
- Custom domains, recurring appointments

See `docs/49-public-booking-ux-branding.md` for full details.

### Milestone 8.6 — Customer Portal & Booking History

Implemented email-based magic-link customer portal for viewing and managing appointments.

**Implemented:**
- Portal access tokens (single-use, 15-min TTL, SHA-256 hash storage)
- Portal sessions (7-day TTL, HTTP-only secure cookies, tenant-scoped)
- Magic-link email via existing notification outbox
- Email enumeration protection (identical response regardless of match)
- Rate limiting (5 requests per 15 min per IP+tenant)
- Portal dashboard with Upcoming/History/Cancelled tabs
- Appointment cards with cancel/reschedule/book-again actions
- Booking rules integration for action eligibility
- Portal entry points in public booking shell
- Token consumption with session creation and redirect
- Logout with session revocation
- Documentation (docs/50-customer-portal-booking-history.md)

**Not implemented (deferred):**
- Permanent customer accounts, passwords, social login
- Cross-tenant customer identity
- Loyalty, reviews, payments

See `docs/50-customer-portal-booking-history.md` for full details.

### Milestone 8.7 — Reviews & Customer Feedback

Implemented tenant-scoped customer review system tied to completed appointments.

**Implemented:**
- customer_reviews table (rating 1–5, comment, status, featured, business_response, snapshots)
- appointment_review_tokens (SHA-256 hash, 30-day TTL, single-use, one active per appointment)
- Review submission via secure token route (/book/{slug}/review/{token})
- Review request email triggered on appointment completion (configurable delay)
- Internal reviews management page (list, summary, moderation, responses, featured toggle)
- Public reviews on booking page (when enabled, first-name-only privacy)
- Review settings (review_requests_enabled, delay, show_public_reviews)
- Appointment detail review integration
- Star rating form with accessibility (aria-label, aria-pressed)
- Documentation (docs/51-customer-reviews-feedback.md)

**Not implemented (deferred):**
- Google Reviews sync, customer accounts, loyalty, AI sentiment

See `docs/51-customer-reviews-feedback.md` for full details.

### Milestone 8.8 — Waitlist & Cancellation Slot Recovery

Implemented tenant-scoped waitlist for customers to register interest when no slots are available.

**Implemented:**
- waitlist_entries table (service/location/resource preferences, date/time range, duplicate protection)
- waitlist_offers table (secure token hash, slot details, expiry, status lifecycle)
- Waitlist matching engine triggered by cancellation
- Offer generation with secure tokens and notification emails
- Public join form and offer consumption route
- Internal waitlist management route (list/filters/status chips)
- Entry/offer expiration service and processing route
- Waitlist settings (enabled, offer_expiry, date_range, batch_size)
- Rate limiting on public join (10/10min)
- Documentation (docs/52-waitlist-slot-recovery.md)

**Not implemented (deferred):**
- Automatic booking, slot holds, priority bidding, AI matching

See `docs/52-waitlist-slot-recovery.md` for full details.

### Milestone 8.9 — Packages & Service Bundles

Implemented tenant-scoped service packages with credit-based reservation/consumption.

**Implemented:**
- service_packages table (name, credits, validity, active/public)
- service_package_services (multi-service eligibility with credits_required)
- customer_packages (ownership with snapshot credits, expiry, status lifecycle)
- customer_package_usage (reserved/consumed/released tracking)
- customer_package_adjustments (manual credit audit trail)
- Appointment columns for package correlation
- 3 concurrency-safe RPCs (reserve/consume/release with row locking)
- Package management route (list, create, edit, toggle)
- Customer assignment with snapshot behavior
- Credit reservation at booking, consumption at completion, release at cancellation
- Manual credit adjustment with audit
- Portal customer packages display
- Tests and documentation (docs/54-service-packages.md)

**Not implemented (deferred):**
- Payment integration, gift cards, memberships, auto-renewal

See `docs/54-service-packages.md` for full details.

### Milestone 8.10 — Loyalty & Rewards

Implemented tenant-scoped customer loyalty with points earning on completion and reward eligibility.

**Implemented:**
- tenant_loyalty_settings (enabled, points_per_appointment, visit tracking)
- customer_loyalty_accounts (balance, lifetime earned, visit count)
- customer_loyalty_transactions (append-only ledger with idempotency)
- loyalty_rewards (points_threshold / visit_threshold definitions)
- customer_reward_redemptions (redemption history)
- Concurrency-safe award RPC (row locking + idempotency key)
- Automatic earning on appointment completion (non-blocking)
- Manual point adjustment with audit
- Reward eligibility calculation
- Portal loyalty data query
- Documentation (docs/55-customer-loyalty-rewards.md)

**Not implemented (deferred):**
- Payment-based earning, gift cards, automatic discounts, tier memberships

See `docs/55-customer-loyalty-rewards.md` for full details.

### Milestone 9.1 — Customer Accounts & Identity Linking

Introduced global customer accounts with tenant-customer linking.

**Implemented:**
- customer_accounts table (global, one per auth user, user_id unique)
- customer_account_tenant_links (links global account to tenant CRM records)
- Verified-email auto-linking with conflict detection
- Lazy account creation for existing auth users
- Linked businesses query
- Tenant-consistency trigger (prevents multi-account linking)
- RLS (customer reads own, tenant members read their tenant's links)
- Link service with safe matching rules
- Documentation (docs/56-customer-accounts-identity-linking.md)

**Not implemented (deferred):**
- Unified cross-tenant appointment history, global loyalty, payments

See `docs/56-customer-accounts-identity-linking.md` for full details.

### Milestone 9.2 — Unified Customer Dashboard & Cross-Tenant Appointment History

Built a customer-facing dashboard showing unified appointments, businesses, and rewards across linked tenants.

**Implemented:**
- Unified appointment queries (link-based authorization, cross-tenant, paginated)
- Customer dashboard route with greeting, upcoming, businesses, navigation
- Unified appointment DTO with tenant timezone formatting
- Dashboard summary (upcoming count, business count, next appointment)
- Linked businesses display with book actions
- Guest/portal compatibility preserved
- Documentation (docs/57-unified-customer-dashboard.md)

**Not implemented (deferred):**
- Business marketplace, favorites, global loyalty/package aggregation, payments

See `docs/57-unified-customer-dashboard.md` for full details.

### Milestone 9.3 — Favorites, Rebooking & Customer Convenience

Implemented customer favorites and rebooking convenience features.

**Implemented:**
- customer_favorite_tenants/services/resources tables with uniqueness
- Tenant-consistency triggers (service/resource belong to tenant)
- RLS (customer reads/writes own favorites only)
- Toggle actions with active-link verification
- Favorite types (business, service, resource, recent booking shortcut)
- Book-again revalidation with fallback behavior
- Documentation (docs/58-customer-favorites-rebooking.md)

**Not implemented (deferred):**
- Marketplace discovery, recommendations, recurring bookings

See `docs/58-customer-favorites-rebooking.md` for full details.

### Milestone 9.4 — Customer Notification Preferences & Communication Center

Implemented per-tenant customer communication preferences and communication center.

**Implemented:**
- customer_notification_preferences table (per tenant+customer, optional toggles)
- Resolved preference model combining tenant capability + customer choice
- Preference upsert with lazy row creation
- Communication types (confirmation/reminder/review/waitlist)
- Update action with link-based authorization
- Transactional vs optional policy documented
- RLS (tenant members + linked customer account access)
- Documentation (docs/59-customer-notification-preferences.md)

**Not implemented (deferred):**
- Marketing consent, SMS, push, newsletters, payment receipts

See `docs/59-customer-notification-preferences.md` for full details.

### Milestone 10.1 — Authorization, Route Protection & Security Audit

Performed a full authorization and route-protection audit across the application.

**Implemented:**
- Consolidated authorization helpers: `requireCustomerAccount`, `requireLinkedTenantCustomer`, `requireCustomerAppointmentAccess`
- Standardized auth error types: `UnauthenticatedError`, `UnauthorizedError`, `TenantAccessDeniedError`, `CustomerLinkRequiredError`, `ResourceNotFoundError`
- Hardened internal API routes (notifications, reminders, waitlist) with timing-safe comparison
- Added explicit role checks to `deleteLocationAction` and `setPrimaryLocationAction` (defense in depth)
- Comprehensive authorization test suite (62 tests across 5 files)
- Complete route inventory and role matrix documentation
- Admin-client usage audit with trust model documentation
- RLS inventory, SECURITY DEFINER audit, cookie audit, redirect audit
- Environment/secret safety verification
- Rate-limit inventory with documented production limitations

**Security invariants verified:**
- Navigation hiding is not relied upon for authorization
- Authentication alone does not grant tenant access
- Tenant slug/UUID knowledge does not grant access
- Customer email equality alone does not grant unified-account access
- Client-supplied tenant/customer/account IDs are not trusted
- Platform-admin routes remain protected (development paused)
- Public tokens independently verified (hash, expiry, revocation, tenant)
- Internal processing endpoints not publicly executable
- No new Polar/payment functionality implemented

**Not implemented (deferred):**
- Redis-backed distributed rate limiting
- MFA/2FA
- Enterprise SSO/SCIM
- Full RLS integration test suite (requires test DB infrastructure)

See `docs/60-authorization-security-audit.md` for full details.

### Architectural Cleanup — Server/Client Page Separation

Enforced the server page.tsx + client-page.tsx convention across all routes.

**Fixed:**
- Removed all `component={Link}` (next/link function reference) from server page.tsx files
- Replaced with `component="a"` (serializable string) where appropriate
- Removed unused `import Link from "next/link"` from server pages
- 10 page.tsx files refactored

**Convention documented:**
- page.tsx = Server Component (auth, data, redirects, DTOs)
- client-page.tsx = Client Component (hooks, state, events, icons, MUI component refs)
- Server → Client props must be serializable (no functions, no component refs)

See `docs/61-server-client-page-architecture.md` for full details.

### Milestone 10.2 — Performance, Query Efficiency & Data-Access Audit

Performed project-wide performance audit focused on query efficiency and scaling.

**Critical fixes:**
- Dashboard analytics: replaced 15K-row Node aggregation with single SQL RPC (`get_dashboard_analytics_summary`)
- Today summary: replaced row-loading count with SQL RPC (`get_today_appointment_counts`)
- Customer CRM list: eliminated N+1 appointment join → batched `get_customers_with_upcoming_flag` RPC
- Customer detail: bounded appointment sub-queries (10 upcoming + 10 recent)
- Package usage/adjustments: added pagination bounds (max 100)

**Performance indexes added (11):**
- 6 appointment composite indexes for calendar/analytics/list hot paths
- 3 partial worker indexes (notification, reminder, waitlist)
- 1 customer-link index for cross-tenant queries
- 1 appointment future-status index for has-upcoming checks

**Tests:** 25 performance contract tests covering bounds, pagination, batch limits

**Not implemented (deferred):**
- Redis rate limiting, full-text search, materialized views, CDN

See `docs/62-performance-query-audit.md` for full details.

### Milestone 10.3 — Observability, Error Handling & Operational Diagnostics

Created consistent operational diagnostics layer for production issue identification.

**Implemented:**
- Centralized structured logger (`lib/logging/logger.ts`) with JSON/human-readable output, 4 levels, auto-redaction
- Typed application error system (`lib/errors/app-error.ts`) with 10 categories, 9 error classes
- Public error mapping (toPublicError) — never exposes internals
- PostgreSQL error code mapping (23505, 23P01, 23503, 23514, 42501)
- Request correlation IDs with validation and generation
- Operation timing with slow-operation warnings (>1s)
- Health endpoint (liveness) and Supabase readiness probe
- Configuration validation (required vs feature-dependent)
- Global error boundaries (error.tsx, global-error.tsx, not-found.tsx)
- Internal API routes migrated to structured logger
- Console audit: all existing logs verified PII/secret-safe

**Tests:** 46 tests (redaction, error mapping, request IDs, DB error mapping)

**Not implemented (deferred):**
- External observability vendor (Sentry, Datadog, OpenTelemetry)
- Distributed tracing, alerting, metrics

See `docs/63-observability-error-handling.md` for full details.

### Milestone 10.4 — Mobile, Accessibility & UX Consistency Audit

Performed project-wide UX hardening for mobile, accessibility, and consistency.

**Major fix:**
- Business backoffice had no navigation on mobile — created responsive AppBar + hamburger drawer with all section links

**Components created:**
- `BusinessShell` — responsive navigation (desktop inline / mobile drawer)
- `LoadingState` — skeleton or spinner with role="status"
- `EmptyState` — consistent empty list messaging + CTA
- `StatusChip` — color-mapped chip that always shows text (never color-only)
- `ConfirmDialog` — destructive confirmation, fullScreen on mobile, focus trap

**Accessibility:**
- Semantic landmarks (header, nav, main)
- ARIA labels on all icon buttons
- Focus trap in drawers and dialogs
- Keyboard navigation verified
- Status never relies on color alone

**Not implemented (deferred):**
- Per-table card view for narrow mobile, bottom sticky CTA, full screen-reader testing

See `docs/64-mobile-accessibility-ux-audit.md` for full details.

### Milestone 10.5 — End-to-End & Integration Test Hardening

Created production-oriented integration and E2E test layer.

**Implemented:**
- Test infrastructure: fixtures, helpers, environment guards, production URL detection
- Integration tests (Vitest + HTTP): health endpoints, authorization boundaries, internal API security (23 tests)
- E2E tests (Playwright): auth boundaries, public booking, self-service, mobile viewport (10 specs)
- Package scripts: test:unit, test:integration, test:integration:required, test:all
- Strict mode (INTEGRATION_REQUIRED=1) for CI enforcement
- Playwright config with chromium + mobile projects

**Coverage:**
- Internal API authentication: missing/wrong/correct secret (9 tests across 3 routes)
- Authorization: anonymous vs protected, public vs private
- Public booking: loads, no data leak, mobile usable
- Self-service: generic error messages, noindex
- Health: accessible, no secrets exposed

**Not implemented (deferred):**
- Full authenticated user E2E (requires test auth setup)
- Package concurrency browser E2E (covered by RPC design)
- Firefox/WebKit matrix

See `docs/65-e2e-integration-testing.md` for full details.

### Milestone 10.6 — Production Launch Readiness

Prepared the application for production deployment.

**Implemented:**
- Complete environment variable inventory with classification (public/secret/optional/test)
- Updated `.env.example` with all supported variables organized by category
- Production security headers: X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy
- Cache control: private/no-store for token routes, portal, customer, internal APIs
- robots.txt excluding authenticated/token/internal routes
- Production runbook (docs/66-production-runbook.md): deployment, migrations, cron, incidents, secrets, recovery
- Launch checklist (docs/67-production-launch-checklist.md): executable checkbox list

**Status: IMPLEMENTED + DOCUMENTED**
- Actual production deployment requires manual action (DNS, env setup, Supabase config, cron)
- Launch checklist provides step-by-step verification procedure

See `docs/66-production-runbook.md` and `docs/67-production-launch-checklist.md` for details.

### Milestone 11.1 — Appointment Payment Model & Payment Intent Foundation

Introduced provider-agnostic appointment payment domain model.

**Implemented:**
- `appointment_payments` table (9 statuses, monetary constraints, tenant isolation)
- `payment_intents` table (7 statuses, idempotent request_key, provider-neutral)
- Relationship verification trigger (tenant consistency)
- RLS (member SELECT, no direct client writes)
- Currency minor-unit utility (20+ currencies, exponent-aware conversion)
- Payment status resolution (pure function, tested precedence rules)
- Query services (payment lookup, latest intent, reusable intent, bounded history)
- Payment intent creation service (eligibility, snapshot, idempotency, reuse)
- Price-change detection helper
- Customer DTO (privacy-safe) and Business DTO
- 42 tests (status resolution, currency, formatting, constants)

**Not implemented (deferred):**
- Polar API calls, checkout sessions, payment capture
- Deposits, refunds, package purchases, invoices
- UI payment buttons (foundation only)

See `docs/68-appointment-payment-foundation.md` for full details.

### Milestone 11.2 — Polar Appointment Checkout Creation

Connected appointment payment model to Polar via real checkout creation.

**Implemented:**
- Provider adapter interface (`AppointmentPaymentProvider`)
- `PolarAppointmentPaymentProvider` using `/v1/checkouts/custom` API
- Checkout orchestration service with full eligibility/reuse/idempotency logic
- Server action (`createAppointmentCheckoutAction`) — amount from server only
- Payment return route (`/book/{tenantSlug}/payment/return`) — read-only, never marks paid
- 35 checkout-specific tests

**Key security guarantees:**
- Return URL visit does NOT confirm payment (webhook-only in 11.3)
- Amount/currency never accepted from client
- amount_paid stays 0 until webhook confirmation
- Metadata contains only correlation IDs (no PII)

**Not implemented (deferred):**
- Webhook payment confirmation (11.3)
- Deposits, refunds, tenant product management

See `docs/69-polar-appointment-checkout.md` for full details.

### Milestone 11.3 — Polar Webhook Sync & Appointment Payment Confirmation

Implemented webhook-authoritative payment confirmation via Polar events.

**Implemented:**
- Appointment payment webhook processor with metadata-based event routing
- `order.paid` as sole authoritative payment-success signal
- Transactional RPC `apply_appointment_payment_order_paid` (locked, idempotent, amount/currency verified)
- Transactional RPC `expire_appointment_payment_intent` (monotonic state transitions)
- Event routing in existing billing webhook processor (appointment vs SaaS separation)
- Checkout expiry handling (intent → expired, payment → unpaid)
- Order projection (provider_order_id persistence without marking paid)
- Out-of-order event safety (succeeded cannot be reverted)
- 38 webhook-specific tests

**Key guarantees:**
- `order.paid` is the ONLY event that marks payment as paid
- Duplicate events cannot double amount_paid (idempotent RPC)
- Out-of-order events cannot revert succeeded state
- Return URL cannot mark payment as paid
- Appointment events cannot mutate SaaS billing tables

**Not implemented (deferred):**
- Customer refund workflow (11.5)
- Deposits (11.4)
- Payment receipt emails

See `docs/70-polar-appointment-payment-webhooks.md` for full details.

### Milestone 11.4 — Appointment Payment Requirements, Deadlines & Booking Integration

Implemented payment policy configuration and deadline-based slot reservation.

**Implemented:**
- `tenant_appointment_payment_settings` table (enable/disable, requirement, deadline 5-60min)
- `service_payment_rules` table (per-service override, NULL=inherit)
- Payment requirement resolver (service → tenant → app default, zero-price/provider checks)
- Payment deadline columns on `appointment_payments` (payment_due_at, expired_at, requires_review)
- Expiry processor with `claim_expired_appointment_payments` RPC (FOR UPDATE SKIP LOCKED)
- `cancel_expired_appointment_payment` RPC (race-safe: re-checks paid under lock)
- `handle_late_appointment_payment` RPC (flags for review, never reactivates)
- Internal API route (`/api/internal/appointment-payments/process-expired`)
- Settings UI (`/{tenantSlug}/settings/payments`) with client-page
- Server actions for tenant + service payment settings (owner/admin only)
- Waitlist matching + reminder cancellation on payment timeout
- 20 resolver/contract tests

**Key guarantees:**
- Existing tenants default to no online payment (safe migration)
- Retry does not extend payment deadline
- Webhook/timeout race protected by transactional locks
- Late payments flagged for review, never auto-reactivate

**Not implemented (deferred):**
- Deposits (11.5 scope change), refunds, package purchasing

See `docs/71-appointment-payment-requirements.md` for full details.

### Milestone 11.5 — Polar Refunds & Financial Reconciliation

Implemented full and partial refund workflows via Polar API.

**Implemented:**
- `appointment_payment_refunds` table (5 statuses, 2 origins, amount constraints, relationship trigger)
- Refundable amount calculation (accounts for pending refund reservation)
- `apply_appointment_refund_succeeded` RPC (idempotent, locked, prevents over-refund)
- `mark_appointment_refund_failed` RPC
- Polar refund API integration via provider adapter
- Refund creation service (validates amount, calls provider, handles failure)
- Server action (owner/admin only, server-side amount authority)
- Provider-initiated refund support (Polar dashboard → webhook → local projection)
- Late payment refund resolution path
- 30 refund-specific tests

**Key guarantees:**
- Refund not confirmed until trusted webhook confirmation
- Concurrent refunds cannot exceed refundable amount (DB locking)
- Duplicate webhooks cannot double amount_refunded
- Provider-initiated refunds sync back from Polar
- Refunds never change appointment operational status

**Not implemented (deferred):**
- Deposits, automatic refund policy, package purchasing, refund receipt emails

See `docs/72-polar-appointment-refunds.md` for full details.

### Milestone 11.6 — Package Purchases through Polar

Connected service packages to Polar for customer online purchase.

**Implemented:**
- `package_purchases` table (9 statuses, snapshot, provider IDs, fulfillment tracking)
- Package pricing columns on `service_packages` (price_amount, price_currency)
- `fulfill_package_purchase` RPC (idempotent, locked, amount/currency verified)
- Purchase creation service (validates active/public/priced, snapshots, calls Polar)
- Package purchase webhook processor (domain routing, order.paid → fulfillment)
- Extended billing webhook router for package_purchase domain
- 30 package purchase tests

**Key guarantees:**
- Package NOT granted from checkout return or order.created
- Package granted ONLY after trusted order.paid webhook
- Duplicate webhooks cannot create duplicate credits (idempotent RPC)
- Price from server (service_packages.price_amount), never client
- Existing manually assigned packages unaffected

**Not implemented (deferred):**
- Package refunds, discounts/coupons, recurring subscriptions, tenant product management

See `docs/73-polar-package-purchases.md` for full details.

### Milestone 11.7 — Tenant Polar Products, Discounts & Provider Resource Sync

Implemented provider resource synchronization and tenant-managed discounts.

**Implemented:**
- `payment_provider_resources` table (local-first sync mapping, optimistic versioning)
- `tenant_discounts` table (percentage 1-99% / fixed, code uniqueness, validity)
- `tenant_discount_targets` table (all_appointments, all_packages, service, package)
- `tenant_discount_redemptions` table (reserved/confirmed/released)
- Provider resource sync service (create mapping → call Polar → persist ID)
- Discount validation service (code → tenant lookup → eligibility → provider ID)
- Discount-to-Polar code namespacing strategy (prevents cross-tenant collision)
- 35 tests

**Key guarantees:**
- Local record exists before provider sync (pending with null ID is valid)
- Tenants never see organization-wide Polar catalog
- Cross-tenant discount usage impossible (tenant-scoped validation)
- Browser cannot submit arbitrary provider discount IDs
- Sync version prevents stale response from overwriting newer edits
- Dynamic appointment/package checkout unchanged (discounts optional)

**Not implemented (deferred):**
- 100% discounts (zero-amount checkout), recurring subscriptions, tenant product management UI (foundation ready)

See `docs/74-polar-tenant-resource-sync.md` for full details.

### Milestone 11.8 — Payment History, Receipts & Financial Dashboard

Created tenant/customer financial history experience.

**Implemented:**
- Migration: provider financial snapshot columns, indexes, `get_tenant_payment_summary` RPC
- Normalized financial history query service (appointment payments + package purchases)
- Tenant payments route (`/{tenantSlug}/payments`) with server/client-page
- Summary cards (per-currency: payments received, refunded, net)
- Financial history table (type, customer, description, amounts, status)
- 14 financial history tests

**Key guarantees:**
- RSD and EUR never summed together
- Refunds reflected in net customer payment
- Terminology: "Payments received" not "Revenue"
- Aggregation via DB RPC (no row-loading)
- SaaS billing completely separate
- Receipt resolved server-side from authorized local transaction

**Not implemented (deferred):**
- CSV export, tenant payout reporting, custom fiscal documents

See `docs/75-payment-history-receipts-financial-dashboard.md` for full details.

### Milestone 11.9 — Polar Reconciliation, Recovery & Production Hardening

Hardened Polar integration with reconciliation, crash recovery, and provider client improvements.

**Implemented:**
- Reconciliation run audit table
- Stale payment intent detection + auto-fail (>10min, no provider ID)
- Paid-but-unfulfilled package recovery (idempotent fulfillment retry)
- Hardened Polar client (12s timeout, rate-limit handling, normalized errors)
- Provider error types (6 classes: RateLimit, Auth, NotFound, Validation, Unavailable, Timeout)
- Retryable vs non-retryable classification
- Internal reconciliation route (`/api/internal/payments/reconcile`)
- Financial invariant definitions
- Manual review reason taxonomy
- 25 reconciliation tests

**Key guarantees:**
- Local paid state never automatically downgraded
- Package credits never granted twice (idempotent RPC)
- Refunds never applied twice (idempotent RPC)
- Provider resource recovery never deletes local tenant entity
- Reconciliation starts from tenant-scoped mappings, not org-wide listing
- Provider API outages don't corrupt financial state

**Not implemented (deferred):**
- Full provider-query reconciliation (webhook retry handles most cases)
- Automated invariant repair (manual_review preferred)

See `docs/76-polar-reconciliation-production-hardening.md` for full details.

### Milestone 12.1 — Team Management & Staff Invitations

Implemented complete team management with secure invitations.

**Implemented:**
- `tenant_member_invitations` table (SHA-256 hashed token, expiry, status lifecycle)
- `accept_tenant_member_invitation` RPC (atomic, concurrency-safe, email-verified)
- `safe_remove_tenant_member` RPC (last-owner protection, role authorization)
- Team management route with full CRUD (invite, revoke, change role, remove)
- Invitation landing page (`/invite/{token}`) with auth continuation
- Invitation authorization matrix (owner/admin can invite, role-filtered options)
- Last-owner invariant protection (DB-level transactional enforcement)
- Member deactivation (preserves history, immediately revokes access)
- 22 team management tests

**Key guarantees:**
- Tokens stored as SHA-256 only (never raw)
- Expired/revoked invitations cannot create membership
- Acceptance requires matching authenticated email
- Concurrent acceptance creates exactly one membership
- Admin cannot promote self to owner
- Tenant always has >= 1 active owner
- Removed member immediately loses authorization

**Not implemented (deferred):**
- Staff/resource profile linking (12.2), ownership transfer UI, resend with new token

See `docs/77-team-management-staff-invitations.md` for full details.

### Milestone 12.2 — Staff Profiles, Resource Linking & Staff Scheduling

Connected team members to the scheduling system via optional staff profiles.

**Implemented:**
- `staff_profiles` table (resource link, optional member link, display fields)
- Tenant consistency trigger (cross-tenant linking rejected at DB level)
- Unique constraints (one profile per resource, one per linked member)
- Staff query service (batched joins, no N+1)
- Staff actions (create, update, link/unlink account)
- Own-schedule resolution (member → profile → resource)
- Public staff DTO (never exposes auth/member data)
- 20 staff profile tests

**Key guarantees:**
- Member does not automatically become bookable
- Resource does not require login
- Removing member does not delete resource
- Deactivating staff does not cancel appointments
- Scheduling truth remains in resource model
- Job titles never grant authorization
- Cross-tenant linking rejected at database level

**Not implemented (deferred):**
- Staff commissions, payroll, shift generation, time-off approval workflow

See `docs/78-staff-profiles-resource-linking.md` for full details.

### Milestone 12.3 — Staff Availability, Time Off & Operational Schedule Management

Built operational staff scheduling layer reusing existing resource infrastructure.

**Implemented:**
- Staff schedule overview service (batched: today counts, upcoming time-off)
- Schedule conflict detection (bounded future appointment query + preview)
- Own-schedule resolution (member → profile → resource, server-verified)
- Staff schedule types (StaffScheduleDTO, ScheduleConflictResult, MyScheduleDTO)
- 25 scheduling tests (authority, availability, conflicts, time-off, roles, bounds)

**Key architecture decisions:**
- NO duplicate schedule tables introduced
- `resource_working_hours` remains recurring schedule source of truth
- `resource_time_off` remains unavailability source of truth
- Staff profiles are presentation/link only (no scheduling fields)
- Schedule changes never auto-cancel appointments
- Time off blocks new bookings but preserves existing ones
- Non-human resources fully compatible

**Not implemented (deferred):**
- Shift management, attendance, leave approval, commissions, payroll

See `docs/79-staff-availability-time-off.md` for full details.
