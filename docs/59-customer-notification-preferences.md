# Customer Notification Preferences & Communication Center

**Milestone 9.4**

## Overview

Customer-facing communication center where permanent account users view recent messages and manage per-tenant notification preferences for optional communications.

## Transactional vs Optional

### Required (cannot be disabled by customer)
- Booking confirmations
- Reschedule confirmations
- Cancellation confirmations

### Optional (customer-controlled)
- Appointment reminders
- Review requests
- Waitlist availability alerts

## Preference Model

`customer_notification_preferences` keyed to `(tenant_id, tenant_customer_id)`. Defaults: all optional enabled. Created lazily on first update.

## Effective Behavior

```
tenant feature supported AND customer preference enabled = communication sent
```

Customer cannot enable features the tenant has disabled.

## Preference Resolution

`resolveCustomerCommunicationPreferences()`:
1. Loads tenant notification settings (what's supported)
2. Loads customer preference row (what's opted-in)
3. Returns per-category: { supported, enabled }

## Reminder Integration

Before creating reminders: check resolved `appointmentReminders.enabled`. Off → skip reminder creation. Turning off cancels pending future reminders. Turning on re-syncs eligible future reminders.

## Review Integration

Before sending review request: check resolved `reviewRequests.enabled`. Off → no email. Review form still accessible via valid authenticated context.

## Waitlist Integration

Before sending waitlist offer: check resolved `waitlistNotifications.enabled`. Off → no email. Waitlist entry remains active. Customer warned about consequence.

## Communication History

Customer-safe projection of notification outbox + reminders. Shows: type, business, title, date, status (queued/sent/failed). Excludes: provider IDs, SMTP errors, internal payloads, retry counts.

## Link-Based Authorization

History and preferences accessed through:
```
auth.uid() → customer_accounts → active links → tenant_customer → preferences/history
```

## Privacy

- No internal error codes exposed
- No provider message IDs
- No raw payloads
- No cross-tenant leakage
- Email alone doesn't authorize access

## Disconnect Behavior

Disconnecting: preferences remain on tenant_customer, hidden from account view. Relinking restores visibility.

## Files Created

```
supabase/migrations/20250805000034_customer_notification_preferences.sql
features/customer-account/types/customer-communication.ts
features/customer-account/services/customer-notification-preferences.ts
features/customer-account/actions/update-communication-preferences-action.ts
features/customer-account/__tests__/customer-communication.test.ts
docs/59-customer-notification-preferences.md
```

## Assumptions

- Preferences keyed to tenant_customer (survives account disconnect)
- Guest users receive defaults (all optional enabled)
- Portal users without account continue with default behavior
- No marketing consent in this milestone
