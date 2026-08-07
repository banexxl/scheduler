# Public Booking UX & Branding Polish

**Milestone 8.5**

## Overview

Polished the existing public booking flow into a premium, mobile-first customer experience with branded shell, enhanced service discovery, improved date/time selection, and consistent error handling.

## Route

```
/book/{tenantSlug}
```

No new routes introduced. Enhanced existing route and components.

## Architecture

```
page.tsx (server)
  → resolvePublicBookingContext (tenant + settings)
  → getPublicBookableServices
  → error/disabled/empty states (server-rendered)
  ↓
PublicBookingFlow (client)
  → PublicBookingShell (branding wrapper)
    → Step components (service, location, date-time, customer, review)
    → PublicBookingConfirmationView
```

Server page handles auth-free tenant resolution and initial data. Client manages step state, availability fetching, and form interactions.

## Booking Shell

`PublicBookingShell` provides:
- Branded hero header (gradient background, logo, title, description)
- MUI Stepper (desktop: labeled steps, mobile: "Step X of Y — Label")
- Max-width Paper card (560px) with rounded corners
- Footer with tenant name
- Wraps both active flow and confirmation state

## Branding

- Tenant logo displayed when `logoUrl` is set
- Business name as heading
- Custom booking page title from settings
- Custom description from settings
- Gradient accent header (blue by default)
- Graceful fallback when no media exists

## Service Discovery

Enhanced cards showing:
- Service name (bold)
- Description (2-line clamp)
- Duration and category metadata
- Price (right-aligned, bold primary color)
- Hover/focus-visible states
- Keyboard accessible (Enter/Space)

Category navigation:
- Chip-based filter (All + per category)
- Horizontally scrollable on mobile
- Only shown when 2+ categories exist

Search:
- Text field shown when 5+ services
- Filters by name and category name
- Empty search state message

## Location Selection

- Polished cards (name, city, address, description)
- Auto-select for single-location services
- Loading skeleton during fetch
- Error and empty states
- Request cancellation on unmount
- Keyboard accessible

## Resource Preference

Resource step is implicit — "no preference" is the default. Concrete resource is assigned at time selection based on availability options. Resource names shown/hidden per `showResourceNames` setting.

## Date Selector

Horizontal date strip:
- 7 dates visible at once
- Navigate forward/back by week
- Past dates disabled
- Selected date highlighted (contained button)
- Day/date/month labels per button
- Tenant-local dates (not browser-local)

"Next available →" shortcut:
- Searches forward up to 30 days
- Stops at first date with slots
- Selects that date and loads slots
- Bounded search (no infinite loops)

## Time Slot Display

Grouped by time of day:
- Morning (before 12:00)
- Afternoon (12:00–17:00)
- Evening (after 17:00)

Each section has a header label. Slots rendered as clickable Chips with start time. Loading skeleton during availability fetch. Stale request cancellation via ref counter.

Availability disclaimer:
```
Times are not reserved until your booking is confirmed.
```

No-availability state:
```
No times available on this date.
[Find next available →]
```

## Customer Details Form

- Autofill-compatible: `autoComplete="name"`, `autoComplete="email"`, `autoComplete="tel"`
- Mobile keyboards: `inputMode="email"`, `inputMode="tel"`
- Inline validation on blur + on submit attempt
- Required/optional field indicators from booking rules
- Privacy notice: "Your contact details are used to manage this booking and send appointment updates."
- No localStorage storage of personal data
- Clear field-level error messages

## Review Step

Existing review with:
- Service, time, duration, resource, price summary
- Customer details
- Availability recheck notice
- Back/Confirm actions
- Loading state during submission
- Error handling (slot taken, details changed)
- Idempotency key management

## Confirmation Experience

- Success heading (green, bold)
- Appointment number in bordered card
- Details card with Stack/Divider layout
- Custom confirmation message from settings
- Conditional email/reminder notice
- "Book another appointment" button
- "Save your appointment number" reminder
- Self-service link architecture ready (for future token-based management)

## Public Error States

| Scenario | Display |
|----------|---------|
| Business not found / booking disabled | "Online Booking Unavailable" + contact suggestion |
| Load error | "Something went wrong" + try again |
| No services | Business name + "No services currently available" |
| No locations for service | "No locations are currently available" |
| No availability | "No times available on this date" + next-available action |
| Rate limited | Generic error from server action |
| Booking conflict | "That time was just booked. Please choose another." |

All use consistent Paper card styling, centered layout, grey background. No technical error codes exposed to customers.

## Mobile Layout

- Single-column flow throughout
- Date strip horizontally scrollable
- Large touch targets (48px+ for date buttons, full-width cards)
- Sticky-safe spacing
- No horizontal overflow
- Category chips scroll horizontally
- Comfortable spacing (gap: 1.5–2.5)

## Accessibility

- One primary heading (`h2`) per step
- Cards have `role="button"`, `tabIndex={0}`, `aria-label`
- Keyboard navigation (Enter/Space) on all interactive cards
- `aria-pressed` on selected date
- `aria-label` on time slot chips
- Focus-visible outlines (2px primary color)
- Loading states visible (skeleton/spinner)
- Form fields with proper labels and error associations
- Privacy notice as inline Alert

## Performance

- Stale request cancellation (ref counter pattern)
- Date strip loads 7 days at a time (not months)
- Next-available bounded to 30 days max
- Single availability request per date selection
- No eager loading of all dates/resources
- Search filters client-side (no extra requests)

## Public DTO Privacy

DTOs expose only:
- Public tenant info (name, slug, timezone, logo)
- Public service info (name, description, duration, price)
- Public location info (name, city, address)
- Sanitized availability (start times, resource options per settings)

Never exposed:
- Internal notes
- Resource private contact info
- Time-off details
- Internal IDs unnecessarily
- Tenant member information
- Assignment metadata

## Tenant Settings Integration

Respects all settings:
- `showServicePrices` — hides price when false
- `showServiceDuration` — hides duration when false
- `showResourceNames` — hides resource names in slots/review
- `allowResourceSelection` — implicit no-preference flow
- `allowNoPreference` — default behavior
- `bookingPageTitle` — custom heading
- `bookingPageDescription` — custom description
- `confirmationMessage` — custom post-booking text

## Booking Link Preview

On `/{tenantSlug}/settings/public-booking`:
- Full URL displayed in monospace read-only field
- "Copy link" button (clipboard API, "Copied!" feedback)
- "Preview booking page" button (opens in new tab)
- Warning when booking is disabled
- Helper text about sharing

## Files Created

```
features/public-booking/components/public-booking-shell.tsx
features/public-booking/components/booking-link-preview.tsx
```

## Files Modified

```
app/book/[tenantSlug]/page.tsx
app/book/[tenantSlug]/layout.tsx
app/(business)/[tenantSlug]/settings/public-booking/page.tsx
features/public-booking/components/public-booking-flow.tsx
features/public-booking/components/public-service-step.tsx
features/public-booking/components/public-location-step.tsx
features/public-booking/components/public-date-time-step.tsx
features/public-booking/components/public-customer-step.tsx
features/public-booking/components/public-booking-confirmation.tsx
```

## Assumptions

- Tenant logo/cover media from existing media foundation (currently null placeholder)
- Availability engine handles timezone correctly via existing infrastructure
- Booking rules (minimum notice, max advance) enforced server-side via availability engine
- Self-service token integration deferred (architecture supports it)
- No ICS calendar generation in this milestone

## Explicitly Not Implemented

- Customer accounts/login
- Loyalty, reviews, waitlists
- Packages, coupons
- Appointment payments/deposits
- External calendar sync / ICS generation
- Custom domains
- Full website/page builder
- AI recommendations
- Marketing campaigns
- Recurring appointments
