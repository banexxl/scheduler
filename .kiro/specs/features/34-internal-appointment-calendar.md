# 34 — Internal Appointment Calendar (Milestone 6.10)

## Overview

An authenticated internal calendar for viewing and managing appointments. Provides day and week scheduling views for tenant members with drag-and-drop rescheduling, status management, and mobile-responsive fallback.

---

## Calendar Route

```
/{tenantSlug}/calendar
```

URL parameters:
- `view` — `day` | `week` (default: `day`)
- `date` — `YYYY-MM-DD` (default: tenant-local today)
- `location` — UUID (filter appointments and resources)
- `resource` — UUID (filter appointments, required for week view)
- `status` — appointment status filter

Parameters are validated server-side via `parseCalendarFilters` with safe defaults for invalid values.

---

## Day and Week View Models

### Day View
- Multiple resources × one date
- Time axis vertically (60px width)
- Resource columns horizontally (max 20)
- Appointment blocks positioned by start/end time
- Hour grid lines every 60 minutes

### Week View
- One selected resource × seven dates (ISO week, Monday start)
- Day columns with date headers
- Today highlighted
- Requires resource selection (defaults to first available)

---

## Tenant Time-Zone Behavior

- All times stored as `timestamptz`
- Display converts to tenant timezone from `tenants.default_timezone`
- Calendar header shows: "Times shown in {timezone}"
- Day/week boundaries use `fromZonedTime` (DST-aware)
- Navigation uses local-date arithmetic, never millisecond offsets
- Spring-forward days are 23 hours; fall-back days are 25 hours
- Browser timezone is never the scheduling authority

---

## Day/Week Boundary Calculations

Utilities in `lib/scheduling/calendar-utils.ts`:

| Function | Purpose |
|----------|---------|
| `getTenantDayRange` | Exact UTC instant range for a local date |
| `getTenantWeekRange` | UTC range for full ISO week |
| `getTenantWeekDates` | 7 local dates (Mon–Sun) |
| `addTenantLocalDays` | Calendar arithmetic navigation |
| `getTenantToday` | Current date in tenant TZ |
| `getTenantCurrentMinutes` | Minutes from midnight for time indicator |
| `getTenantDayDurationMinutes` | Actual day length (handles DST) |

---

## Query Strategy

`getCalendarAppointments` uses overlap semantics:

```
starts_at < rangeEnd AND ends_at > rangeStart
```

- Tenant-scoped via RLS
- Excludes cancelled by default
- Limit 200 per request
- Ordered by starts_at
- Single bulk query per visible range

---

## Resource and Location Filtering

### Location filter
- Filters appointments to selected location
- Filters resource columns to resources with active assignment at that location
- Clears resource selection if incompatible

### Resource filter
- Day view: shows all resources or one selected
- Week view: requires one selected resource
- Preserved during date navigation

---

## Appointment Positioning

```ts
getAppointmentBlockPosition(startsAt, endsAt, localDate, timeZone, config)
→ { top, height, clippedTop, clippedBottom }
```

- Position based on tenant-local time within configurable grid (default 07:00–21:00)
- Grid auto-expands via `resolveCalendarBounds` to include off-hours appointments
- Minimum block height: 24px (for 5-min appointments)
- Clipped top/bottom when appointment extends beyond grid

---

## Buffer Visualization

Appointment blocks represent customer-visible service time. Buffer regions are subtle — the occupied window (with buffers) is shown in the detail drawer. The main block does not render separate buffer sections to avoid visual clutter.

---

## Status Styling

| Status | Background | Border |
|--------|-----------|--------|
| Pending | #fff3e0 | #ff9800 |
| Confirmed | #e3f2fd | #1976d2 |
| Checked in | #e0f7fa | #00acc1 |
| In progress | #f3e5f5 | #9c27b0 |
| Completed | #e8f5e9 | #4caf50 |
| Cancelled | #fafafa | #bdbdbd |
| No-show | #f5f5f5 | #757575 |

Status is indicated by color AND text label (compact mode shows color only with accessible aria-label).

---

## Operating-Hours Overlays

`CalendarHoursOverlay` renders background layers:
1. Closed time (grey, full column)
2. Location open hours (green tint)
3. Resource working hours (blue tint)
4. Time off blocks (red tint)

Legend at bottom of calendar explains colors.

---

## Time-Off Display

Time-off blocks rendered as red-tinted background with "Unavailable" label. No private notes exposed on calendar — detailed info remains on resource management page.

---

## Drag-and-Drop Rescheduling

### Behavior
1. Mouse down on appointment block starts drag
2. Block follows cursor vertically (reduced opacity, z-index elevated)
3. Snaps to 15-minute grid on release
4. If moved >4px, fires reschedule request (not a click)
5. Confirmation dialog shows current vs proposed time
6. Calls `rescheduleAppointmentAction` on confirm
7. Server revalidates availability, assignments, and conflicts
8. On success: page refreshes with new position
9. On failure: block returns to original position, error shown

### Conservative Optimistic Policy
- Block returns to original position immediately on drop
- No permanent position change until server confirms
- Conflict message: "This time is no longer available. The calendar has been refreshed."

### Cross-Resource Dragging
- Supported in day view (drag between columns)
- Triggers full rescheduling with assignment revalidation
- Duration/price may change due to resource-specific overrides

---

## Appointment Detail Interaction

Clicking a block opens a right-side drawer showing:
- Appointment number, status
- Date/time in tenant TZ
- Customer, service, resource, location
- Duration, price
- Links to full detail page and edit page

---

## Create Interaction

"New Appointment" button in toolbar links to `/{tenantSlug}/appointments/new`. Calendar-click creation deferred to future enhancement.

---

## Mobile Behavior

- Breakpoint: `md` (below 900px)
- Renders `CalendarMobileAgenda` instead of grid views
- Sorted card list with time, customer, service, resource, status
- All actions accessible without drag-and-drop
- Keyboard accessible (role=button, tabIndex)
- Drawer opens full-width on mobile

---

## Accessibility

- Appointment blocks: `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space
- Blocks have `aria-label` with customer name, service, and time
- Status not represented by color alone (text labels)
- Current-time indicator: `aria-hidden="true"`
- Drawer focus managed by MUI
- Reschedule form available as non-drag alternative (via edit page)

---

## Performance Boundaries

- Day view: 1 local date, max 20 resource columns
- Week view: 7 local dates, 1 resource
- Max 200 appointments per query
- Single bulk query per visible range
- No per-appointment client fetches
- Current-time indicator updates every 60s (no data refetch)

---

## Deferred: Public Booking

Not implemented: public calendar pages, customer booking, guest access.

## Deferred: External Calendar Sync

Not implemented: Google Calendar, Outlook, iCal import/export.

## Deferred: Advanced Features

Not implemented: month view, recurring appointments, multi-resource, room scheduling, automated assignment, resize-to-change-duration.

---

## Manual Verification Steps

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

---

## Assumptions

- Calendar route added but not yet linked in business navigation sidebar (can be linked in layout)
- Operating-hours overlay component is created but requires server-side location/resource hour data to be passed (future enhancement to load in calendar page)
- Availability candidate overlay deferred (requires explicit service selection)
- No real-time subscriptions — manual refresh via page navigation
- Cross-location drag deferred to reschedule form
