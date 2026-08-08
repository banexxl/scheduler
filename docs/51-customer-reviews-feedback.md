# Customer Reviews & Feedback

**Milestone 8.7**

## Overview

Tenant-scoped customer review system tied to completed appointments. Customers leave feedback through secure, appointment-specific links without requiring an account.

## Eligibility

Reviews allowed only for appointments with `status = completed`. No reviews for pending, confirmed, cancelled, or no-show appointments.

## Token Model

- 32-byte high-entropy base64url token
- SHA-256 hash stored in DB
- 30-day expiration after creation
- Single-use (used_at set on submission)
- One active token per appointment (partial unique index)
- Token created after appointment completion

## Review Request Flow

```
Appointment → completed
  → triggerReviewRequest (non-blocking)
    → Check review_requests_enabled
    → Create review token
    → Render email template
    → Enqueue to notification_outbox with delay
```

Configurable delay: `review_request_delay_minutes` (default: 60 min).
Idempotency key: `appointment:{id}:review-request` (one request per appointment).

## Notification Template

Type: `appointment_review_request`
- Subject: "How was your appointment with {tenant_name}?"
- Body: CTA button to review URL, personal link disclaimer
- Variables: tenant_name, customer_name, service_name, appointment_date, review_url

## Submission Flow

1. Customer clicks secure link
2. Server validates token (not used/expired/revoked, appointment completed)
3. Displays branded review form
4. Customer selects 1–5 star rating + optional comment
5. Server inserts review with snapshots
6. Token marked used
7. Success confirmation displayed

## Review Table

| Column | Description |
|--------|-------------|
| rating | 1–5 (CHECK constraint) |
| comment | Optional, max 2000 chars |
| status | published / hidden / flagged |
| is_featured | Boolean for public prominence |
| business_response | Optional, max 2000 chars |
| snapshots | service_name, resource_name, customer_name |
| unique | (tenant_id, appointment_id) |

## Idempotency

`UNIQUE (tenant_id, appointment_id)` prevents duplicate reviews. Token single-use prevents resubmission. Duplicate insert returns existing success.

## Internal Reviews Route

`/{tenantSlug}/reviews` — server/client architecture:
- Summary: average rating, total, rating distribution (5★ to 1★)
- List: rating, customer, service, status, comment, response, date
- Actions: Publish, Hide, Flag, Feature/Unfeature, Respond

## Business Responses

Owner/admin/manager can add `business_response` (max 2000 chars). Records responded_at and responded_by. Editable.

## Moderation

| Action | Effect |
|--------|--------|
| Publish | Visible internally + publicly (if enabled) |
| Hide | Visible internally only |
| Flag | Requires attention, excluded from public |

No physical deletion for normal moderation.

## Public Visibility

Setting: `show_public_reviews` (default: false)

When enabled, booking page shows:
- Average rating + review count
- Up to 3 featured/recent published reviews
- First name only (privacy)

Hidden and flagged reviews never appear publicly.

## Public Privacy

Customer display: first name only (e.g., "Ana"). Never exposed: email, phone, customer ID, appointment number.

## Featured Reviews

Owner/admin can mark `is_featured`. Featured reviews sorted first in public display. Does not affect rating aggregation.

## Historical Entity Behavior

Reviews remain valid if service/resource/location is deactivated. Snapshot fields provide fallback display names.

## Settings

On `/{tenantSlug}/settings/reviews` or notifications page:
- Review requests enabled (boolean)
- Review request delay (minutes)
- Show public reviews (boolean)

Default: all disabled (no unexpected emails after deployment).

## Booking Page Integration

When show_public_reviews enabled, `PublicReviewsSummary` component shows average + recent reviews below service list. Compact, non-intrusive.

## Appointment Detail Integration

On completed appointment detail page:
- If review exists: shows rating + comment
- If no review: shows "Feedback not received"

## Status Transition Integration

`updateAppointmentStatusAction` triggers `triggerReviewRequest` non-blocking when status transitions to "completed".

## RLS

- customer_reviews: members SELECT, owner/admin/manager UPDATE
- appointment_review_tokens: REVOKE ALL from anon/authenticated
- All mutations via trusted server actions/admin client

## Mobile UX

- Large star buttons (48px touch targets)
- Full-width comment field
- Single-column layout
- Large submit button

## Accessibility

- Star rating: `aria-label` per star, `aria-pressed` for selected
- Rating announced: "X out of 5"
- Form labels, error announcements
- Keyboard accessible stars

## Security

- No submission without valid token
- No reviews for non-completed appointments
- Cross-tenant access impossible
- Token single-use
- Customer text sanitized (no HTML rendering)
- Public privacy (first name only)

## Files Created

```
supabase/migrations/20250805000028_customer_reviews.sql
features/reviews/types/review.ts
features/reviews/services/review-token-service.ts
features/reviews/services/review-submission-service.ts
features/reviews/services/review-request-service.ts
features/reviews/services/review-queries.ts
features/reviews/actions/submit-review-action.ts
features/reviews/actions/manage-review-actions.ts
features/reviews/actions/update-review-settings-action.ts
features/reviews/components/review-form.tsx
features/reviews/components/public-reviews-summary.tsx
features/reviews/__tests__/review-types.test.ts
app/book/[tenantSlug]/review/[token]/page.tsx
app/(business)/[tenantSlug]/reviews/page.tsx
app/(business)/[tenantSlug]/reviews/client-page.tsx
```

## Files Modified

```
features/appointments/actions/update-status-action.ts (trigger review request on completion)
app/book/[tenantSlug]/page.tsx (public reviews summary)
```

## Assumptions

- Existing notification outbox handles delayed review request delivery
- Tenant has SMTP configured for email delivery
- review_requests_enabled defaults to false (safe deployment)
- No customer account required for review submission

## Explicitly Not Implemented

- Google Reviews synchronization
- Trustpilot / external review platforms
- Global review marketplace
- Customer accounts / loyalty
- AI sentiment analysis
- Automatic staff rankings
- Gift cards, waitlists, packages, coupons
- Appointment payments
- Marketing automation
- External calendar sync
- Recurring appointments
