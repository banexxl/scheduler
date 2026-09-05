# 38 - Customer Appointment Self-Service

## Milestone 6.14 Summary

This milestone introduces secure, token-based customer self-service for a single appointment without customer accounts.

Supported public actions:
- View appointment
- Cancel appointment
- Reschedule appointment

Out of scope remains unchanged:
- Customer accounts, passwords, permanent dashboards
- Payments/refunds/deposits/fees
- Recurring/group/waitlist flows
- External calendar sync and ICS attachments

## Authorization Model

Route:
- /manage-appointment/[token]

Token properties:
- Opaque, high-entropy random token (32 random bytes, base64url)
- Stored lookup value is SHA-256 hash only
- Scoped to one tenant + one appointment + purpose manage_appointment
- Expirable and revocable
- Raw token never stored in plaintext

Generic public failure response:
- This appointment link is invalid or no longer available.

## Data Model

Migration:
- supabase/migrations/20250805000019_appointment_self_service.sql

Tables:
- appointment_access_tokens
- appointment_customer_actions
- appointment_customer_requests

Added token encryption fields:
- token_ciphertext
- token_iv
- token_auth_tag
- encryption_key_version

## Hashing and Encryption

Hashing:
- SHA-256(rawToken) used for authentication lookup

Encryption:
- AES-256-GCM with random IV per token
- APPOINTMENT_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes
- Key version is stored per token row for future rotation
- Decryption/auth tag verification fails closed

## Expiry, Rotation, Revocation

Expiry policy:
- Min(appointment_start + 30 days, token_created + 365 days)

Rotation behavior:
- rotate_appointment_access_token RPC revokes active token(s)
- Inserts replacement row atomically
- Raw URL is returned once at generation time only

Revocation behavior:
- Owner/admin can revoke active token
- Revocation immediately disables public access
- Appointment itself is not cancelled

## Public DTO and Privacy

Public DTO type:
- PublicManagedAppointment

Public response excludes:
- Appointment UUID
- Tenant ID
- Customer identifiers and contacts
- Internal notes and internal reason codes
- Raw token, token hash, token ciphertext

## Cancellation and Rescheduling

Cancellation flow:
1. Resolve token
2. Re-check booking rules and status eligibility
3. Validate optional reason
4. Execute existing cancellation service
5. Record action log
6. Trigger reminder/notification side-effect hooks

Reschedule flow:
1. Resolve token
2. Re-check booking rules and status eligibility
3. Load availability with trusted exclusion of current appointment
4. Require exact slot re-match on submit
5. Re-check reviewed price/currency/duration
6. Execute existing reschedule service
7. Record action log
8. Trigger reminder/notification side-effect hooks

Stale slot behavior:
- Returns: That time is no longer available. Please choose another time.

Details-changed behavior:
- Returns DETAILS_CHANGED when reviewed values no longer match

## Idempotency

Table:
- appointment_customer_requests

Key semantics:
- Unique(access_token_id, request_type, idempotency_key)
- Same key + same payload: replay stored result
- Same key + different payload: reject safely

## Rate Limiting

Current server-side limits (10-minute window):
- Page view group: 60
- Availability group: 60
- Mutation group: 10

Keying:
- access_token_id + optional hashed client IP (HMAC-SHA256)

## Security Headers and Indexing

For /manage-appointment/:token:
- Referrer-Policy: no-referrer
- Cache-Control: private, no-store
- X-Robots-Tag: noindex, nofollow

Page metadata:
- robots index: false
- robots follow: false

## Internal Management Integration

Internal appointment detail now includes self-service section:
- Active token metadata
- Token history
- Customer action history
- Generate/rotate link
- Revoke link
- Copy-once display for newly generated link

## Notification/Reminder Integration Status

Implemented integration points:
- On appointment creation, generate token if customer email exists (best-effort)
- Pass manage URL into self-service side-effect hooks

Current repository status:
- Notification/reminder queue infrastructure is not yet implemented in this codebase
- Hook methods are explicit safe stubs and do not mutate appointment state

## Environment Variables

Required:
- PUBLIC_APP_URL=https://your-app.example
- APPOINTMENT_TOKEN_ENCRYPTION_KEY=<32-byte key material>

Compatibility fallback:
- NEXT_PUBLIC_APP_URL may be used if PUBLIC_APP_URL is not set

## Cleanup Guidance

Recommended operational cleanup task:
- Revoke/delete expired tokens after retention period
- Purge old failed idempotency rows in bounded batches
- Retain customer action logs per audit policy

Do not run unbounded deletes in web requests.

## Accessibility and Mobile Notes

Public management page includes:
- Single-column mobile-first layout
- Text status labels (not color-only)
- Large action buttons
- Keyboard/clickable time selection chips
- Confirmation dialog for cancellation
- Inline success/error announcements

## Assumptions

- Existing appointment mutation services remain the source of truth.
- PostgreSQL exclusion constraints continue to enforce scheduling concurrency.
- Self-service route does not expose internal appointment identifiers.
- Notification/reminder transport will be connected in a later milestone.

## Manual Verification Checklist

1. Generate management link from internal appointment page.
2. Open /manage-appointment/[token] and verify summary renders.
3. Confirm cancelled/completed/no_show states disable public mutations.
4. Cancel an eligible appointment and verify idempotent repeat behavior.
5. Reschedule into valid slot; verify stale-slot and DETAILS_CHANGED handling.
6. Revoke token and verify generic unavailable message.
7. Confirm no token hash/ciphertext exposed in any client payload.
8. Validate noindex/no-store/no-referrer behavior on token route.

## Rollout Checklist

Operational rollout steps are documented in:

- docs/39-self-service-rollout-checklist.md
