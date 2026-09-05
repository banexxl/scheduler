# Recurring Appointments — Milestone 15.1

## Architecture

```text
Recurrence Rule → generateRecurringOccurrences() → Occurrence timestamps
                                                           ↓
                                            Availability validation
                                                           ↓
                                            Atomic series creation
                                                           ↓
                                    appointment_series + N appointment rows
```

Every occurrence is a real `appointments` row — fully compatible with calendar, My Day, payments, packages, loyalty, reviews, reminders, notifications.

---

## Database

**Migration:** `20260807000017_recurring_appointments.sql`

**Tables:**
- `appointment_series` — series metadata, recurrence rule, bounds, snapshots
- `appointments` — added `series_id`, `series_occurrence_index`, `is_series_exception`

**Constraints:**
- Recurrence type: daily, weekly, monthly
- Interval: 1–12
- Max occurrences: 52
- End condition required (end date OR occurrence count)
- Weekly requires days_of_week
- Monthly requires day_of_month (1–31)

**RLS:** Tenant-member SELECT, owner/admin INSERT/UPDATE

---

## Recurrence Types

| Type | Interval | Additional | Example |
|---|---|---|---|
| daily | every N days | — | Every 2 days at 10:00 |
| weekly | every N weeks | days_of_week[] (0=Sun) | Every Mon, Wed, Fri at 09:00 |
| monthly | every N months | day_of_month (1–31) | Monthly on the 15th at 16:00 |

---

## Timezone & DST

- Recurrence uses **tenant timezone** as authority
- Local appointment time remains stable across DST transitions
- Generation: local time → `fromZonedTime()` → UTC
- Example: "Every Monday at 10:00 Europe/Belgrade" stays at 10:00 local whether CET or CEST

---

## Series Creation

1. User configures recurrence rule
2. `generateRecurringOccurrences()` produces timestamps
3. Availability checked for every occurrence (conflict detection)
4. If any conflicts → creation rejected, conflicts shown
5. If all clear → atomic insert of series + all appointments
6. Rollback on partial failure

---

## Conflict Handling

- Checks for overlapping appointments on same resource
- Returns list of conflicting dates
- Series NOT partially created (all or nothing)

---

## Edit One Occurrence

- Uses existing appointment edit/reschedule
- Only that appointment changes
- Marked `is_series_exception = true`
- Series rule unchanged

---

## Edit This and Future (Series Split)

- Original series ends at split point
- New series created from that point with new rule
- Past/completed appointments never modified
- Only future non-terminal occurrences affected

---

## Cancel One Occurrence

- Sets appointment status to `cancelled`
- Marks `is_series_exception = true`
- Other occurrences unaffected
- Normal side effects (reminders, waitlist) apply

---

## Cancel This and Future

- Cancels all future eligible occurrences (confirmed/pending)
- Updates series status to cancelled if no remaining active occurrences
- Past/completed appointments preserved

---

## Payment Policy

- **Initial scope:** Recurring series NOT supported for services requiring online prepayment
- Each occurrence is independent (no aggregate billing)
- No recurring Polar charges
- Pay-at-business works normally

---

## Package Policy

- **Initial scope:** Packages cannot fund recurring series creation
- Each occurrence treated independently for credit operations

---

## Notifications

- One series confirmation notification (not 52 separate emails)
- Reminders per occurrence via existing reminder scheduling

---

## Loyalty/Reviews

- Each completed occurrence earns loyalty normally
- Review requests per completed occurrence
- Existing idempotency preserved

---

## Customer Experience

- Customer sees individual appointments (each manageable)
- Customer cancellation: one occurrence only (not entire series)
- Appointment cards show "Recurring" indicator

---

## Performance

- Max 52 occurrences per series
- Generation is pure/in-memory (no DB per date)
- Series views paginated
- Availability validation bounded

---

## Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/20260807000017_recurring_appointments.sql` | DB schema |
| `features/recurring-appointments/types/recurrence.ts` | Types, constants |
| `features/recurring-appointments/services/generate-occurrences.ts` | Pure occurrence generator |
| `features/recurring-appointments/actions/create-series-action.ts` | Atomic series creation |
| `features/recurring-appointments/actions/cancel-series-action.ts` | Cancel one/future |
| `features/recurring-appointments/__tests__/recurrence-generator.test.ts` | Unit tests |
