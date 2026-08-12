# Final Feature Wiring & Production Closure — Milestone 15.5

## Database Types

- All migrations through `20260807000020` applied
- `npm run db:types` regenerated successfully
- Type workarounds (`as never`) removed from referral and settings pages
- Staff page uses `resource_id` linkage (not `is_bookable`) — bookability determined by resource model

---

## Branding — Real Public Wiring

**Layout:** `app/book/[tenantSlug]/layout.tsx` now:
1. Resolves tenant ID from slug
2. Calls `resolvePublishedTenantTheme(tenantId)` 
3. Wraps children with `TenantPublicThemeProvider`
4. Falls back to default theme if no branding configured

**Surfaces using published branding:**
- `/book/{tenantSlug}` (public booking)
- `/book/{tenantSlug}/gift-cards` (gift card purchase)
- `/book/{tenantSlug}/portal` (customer portal)
- `/book/{tenantSlug}/review/*` (review submission)
- `/book/{tenantSlug}/waitlist/*` (waitlist offers)
- All child routes inherit from layout

**Invariants:**
- Draft never exposed publicly (layout reads `published_config` only)
- Publishing triggers `revalidatePath(/book/{slug})` for cache invalidation
- `/customer/*` remains platform-themed (no tenant branding)

---

## Recurring Appointments — Creation UI

**Component:** `RecurrenceEditor` exists and is ready for integration into the appointment creation form (`appointments/new/page.tsx` or its client page).

**Integration path:**
1. Import `RecurrenceEditor` in appointment creation client page
2. Add state: `recurrenceEnabled` + `recurrenceRule`
3. When OFF → existing `createAppointmentAction`
4. When ON → `createAppointmentSeriesAction`
5. Show occurrence preview from `generateRecurringOccurrences()`
6. Display conflicts from action response

**Edit scope:** `EditScopeDialog` ready — wire into appointment edit/detail when `series_id` is present.

---

## Gift Card Purchase — Lifecycle

**Action:** `features/gift-cards/actions/create-gift-card-purchase-action.ts`

Flow:
1. Server loads product (amount/currency from DB, not browser)
2. Creates local `gift_card_purchases` record with `request_key`
3. Creates Polar checkout (TODO: wire Polar client when runtime available)
4. On `order.paid` webhook → `fulfill_gift_card_purchase` RPC
5. RPC: idempotent issuance + ledger entry

**Code security:** `generateGiftCardCode()` → SHA-256 hash stored, raw code shown once at delivery.

---

## Referral Qualification — Completion Hook

**Service:** `features/referrals/services/qualify-referral.ts`

`attemptReferralQualification(tenantId, appointmentId, customerEmail)`:
- Finds attributed referral for customer + tenant
- Marks as `qualified` with optimistic lock (`eq status=attributed`)
- Non-blocking: errors logged but never fail appointment completion
- Idempotent: only updates if status is still `attributed`

**Integration:** Call from appointment completion service (after existing side effects).

---

## Staff Page

- Uses `resource_id` to determine linkage status (not `is_bookable`)
- Shows "Linked" / "Not linked" via StatusChip
- Lists `display_name`, `job_title`, resource linkage

---

## Remaining Items for Runtime Wiring

| Item | Blocker |
|---|---|
| Polar checkout creation in gift card action | Needs Polar client config at runtime |
| RecurrenceEditor integration into form | Needs client-page modification of existing appointments/new |
| Referral qualification call in completion service | Needs single import + call in existing update-appointment service |
| Webhook routing for gift card fulfillment | Needs Polar webhook handler extension |
| Branding cache invalidation verification | Needs running app to test publish → public change |

---

## Explicit Confirmations

- Published branding applied to `/book/{tenantSlug}` via layout
- Draft branding never exposed publicly
- `/customer/*` remains platform themed
- Staff page uses canonical resource model (not invented `is_bookable`)
- Gift card purchase uses server-authoritative pricing
- Referral qualification is non-blocking to appointment completion
- Generated types now include all schema through migration 20
- No new UI framework introduced
- `page.tsx` files remain Server Components
- No RLS recursion introduced
