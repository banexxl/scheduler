# Business Notification Center

Milestone 12.5 — Completed August 2026.

---

## 1. Purpose

Internal operational inbox for business users. NOT customer email delivery.
Answers: what happened, what needs attention, when, which entity, can I act on it.

---

## 2. Separate from Notification Outbox

| System | Purpose |
|--------|---------|
| `notification_outbox` | Outbound customer emails (booking/reminder) |
| `tenant_operational_notifications` | Internal business inbox |

Never mix these.

---

## 3. Schema

- 8 categories (appointments, customers, reviews, waitlist, payments, communications, team, system)
- 4 severities (info, attention, warning, critical)
- Deduplication key (unique per tenant, prevents webhook replay duplicates)
- Per-member read state (separate table)
- Tenant-wide resolution (resolved_at, resolved_by, note)

---

## 4. Visibility

| Role | Sees |
|------|------|
| Owner/Admin | All tenant notifications |
| Manager | Operational notifications (appointments, reviews, waitlist, customers) |
| Staff | Only own-resource notifications |

Unread count cannot leak hidden notification existence.

---

## 5. Non-Blocking

Notification creation failure is logged but never thrown.
Critical domain operations (appointment create, payment confirm) continue regardless.

---

## 6. Action URLs

- Must start with `/` (internal only)
- Validated before storage
- `javascript:`, `//`, `https://external` all rejected
- Entity ID authorization still checked by destination route

---

## 7. Test Coverage: 20 tests

- Constants (2), deduplication (3), non-blocking (1)
- Read state (2), resolution (3), staff visibility (3)
- Cross-tenant (2), action URLs (2), metadata (1), pagination (2)
