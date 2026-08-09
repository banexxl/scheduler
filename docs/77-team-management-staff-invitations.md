# Team Management & Staff Invitations

Milestone 12.1 — Completed August 2026.

---

## 1. Invitation Architecture

```
Owner/admin invites email+role
  → generate 32-byte token (base64url)
  → store SHA-256 hash only
  → enqueue invitation email with URL
  → invitee opens /invite/{token}
  → authenticates (sign in or create account)
  → RPC verifies: pending, not expired, email matches
  → atomic: create membership + mark accepted
```

---

## 2. Token Security

- 32 bytes random (crypto.randomBytes)
- Encoded base64url in invitation URL
- Only SHA-256 hash stored in DB
- Token prefix (10 chars) for diagnostics
- 7-day expiration
- Generic "unavailable" for all invalid states

---

## 3. Authorization Matrix

| Action | Owner | Admin | Manager | Staff |
|--------|:-----:|:-----:|:-------:|:-----:|
| View team | ✓ | ✓ | ✓ | ✓ |
| Invite staff/manager | ✓ | ✓ | — | — |
| Invite admin | ✓ | ✓ | — | — |
| Invite/assign owner | ✓ | — | — | — |
| Change roles | ✓ | Limited | — | — |
| Remove member | ✓ | Limited | — | — |
| Revoke invitation | ✓ | ✓ | — | — |

---

## 4. Last Owner Protection

- Enforced in `safe_remove_tenant_member` RPC
- Counts active owners under FOR UPDATE lock
- If count ≤ 1: removal/demotion rejected
- Concurrent operations cannot bypass (transactional)

---

## 5. Member Removal

- Sets `status = 'inactive'` (not delete)
- Historical attribution preserved
- `requireTenantMember()` filters on `status = 'active'`
- Immediate authorization revocation

---

## 6. Acceptance RPC

Atomic transaction:
1. Lock invitation (FOR UPDATE)
2. Verify pending + not expired + not revoked
3. Verify authenticated email matches
4. Check no existing membership
5. INSERT tenant_members
6. UPDATE invitation → accepted

Concurrency-safe: second caller sees non-pending status.

---

## 7. Test Coverage: 22 tests

- Roles (1), authorization (5), token security (3)
- Expiration (2), acceptance security (2)
- Last owner (3), role escalation (2)
- Member removal (2), cross-tenant (2)
