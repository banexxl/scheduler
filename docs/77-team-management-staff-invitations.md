# Team Management & Staff Invitations

Milestone 12.1 — Completed August 2026.
Revalidated & refactored to Supabase native invites — September 2026.

---

## 1. Invitation Architecture (Supabase Native)

Team invitations use Supabase Auth's built-in invite/magic-link tokens. The
app no longer stores its own invitation token table — Supabase owns the token,
its hashing, expiry, and the invite email. The app only carries the target
tenant + role on the invited user's server-controlled `app_metadata`, and
applies the role in a custom redirect route.

```
Owner/admin invites email + role
  → new email:      auth.admin.inviteUserByEmail(email, { redirectTo, data })
    existing user:  set app_metadata.pending_tenant_invite + generateLink(magiclink)
  → app_metadata.pending_tenant_invite = { tenant_id, tenant_slug, role, invited_by, invited_at }
  → Supabase emails the native invite/magic-link (redirectTo = /api/auth/accept-invite)
  → invitee clicks link → /api/auth/accept-invite
      → exchange code / verifyOtp → session established
      → read pending_tenant_invite from app_metadata
      → accept_pending_tenant_invite(user_id, tenant_id, role) → tenant_members row with role
      → clear pending_tenant_invite metadata
      → new invitee → /update-password (set a password) → tenant dashboard
        existing user → tenant dashboard
```

Membership + role are applied at **acceptance time** (not at invite time), so
the invited role is exactly what lands in `tenant_members.role`.

---

## 2. Token Security

- Token generation, hashing, and expiry are handled by Supabase Auth.
- The invite link's `redirectTo` points to `/api/auth/accept-invite`. This URL
  must be added to the Supabase Auth redirect allow-list.
- The role travels in `app_metadata` (server-controlled, not user-editable),
  not in the URL, so a user cannot tamper with their assigned role.
- No custom SHA-256 token table exists anymore (`tenant_member_invitations`
  and `accept_tenant_member_invitation` were dropped).

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

`canInviteRole` enforces the invite column; `changeTenantMemberRoleAction` and
the `safe_remove_tenant_member` RPC enforce the change/remove columns.

---

## 4. Last Owner Protection

- Enforced in `safe_remove_tenant_member` RPC (retained) and in
  `changeTenantMemberRoleAction` for demotions.
- Counts active owners under a `FOR UPDATE` lock.
- If count ≤ 1: removal/demotion rejected.
- Concurrent operations cannot bypass (transactional).

---

## 5. Member Removal & Invitation Revocation

Both "Remove member" and "Revoke invitation" hard-delete access:

- `safe_remove_tenant_member` RPC first enforces authorization + last-owner
  protection (and admin-cannot-remove-owner).
- On approval, the `tenant_members` row is hard-deleted (not soft-deactivated).
- The `auth.users` account is deleted entirely when the user has no membership
  in any OTHER tenant. If the account belongs to other businesses, it is kept
  and only removed from the current tenant, so shared accounts are never wiped.
- Revocation additionally clears the `pending_tenant_invite` metadata and
  applies the same last-owner guard inline.

---

## 6. Acceptance RPC — `accept_pending_tenant_invite`

Atomic transaction (`SECURITY DEFINER`):
1. Validate role ∈ (owner, admin, manager, staff) and tenant exists.
2. Lock any existing `tenant_members` row for user+tenant (`FOR UPDATE`).
3. If an active membership exists → `already_member` (idempotent re-click).
4. If an inactive membership exists → reactivate with the invited role.
5. Otherwise INSERT `tenant_members` with the invited role, `status = 'active'`.
6. Return `{ status, membership_id, tenant_id, tenant_slug, role }`.

Idempotent and concurrency-safe: a second click resolves to `already_member`.

---

## 7. Pending Invitations & Revocation

- There is no invitations table. "Pending invitations" for a tenant are derived
  from Supabase Auth users whose `app_metadata.pending_tenant_invite.tenant_id`
  matches the tenant and who are not yet active members
  (`getTeamInvitations`).
- Revoking (`revokeTenantInvitationAction`, keyed by the invited user id):
  - Clears `pending_tenant_invite` from the user's `app_metadata`.
  - If the account was created solely for a never-accepted invite (no confirmed
    email, no sign-in, no membership anywhere), the auth user is deleted.

---

## 8. Key Files

- `features/team/actions/team-actions.ts` — invite / revoke / change-role / remove.
- `features/team/services/team-queries.ts` — members + derived pending invitations.
- `features/team/types/team.ts` — `TenantRole`, `PendingTenantInvite`, `PENDING_INVITE_KEY`.
- `app/api/auth/accept-invite/route.ts` — custom acceptance redirect route.
- `supabase/migrations/20260807000036_native_invite_accept.sql` — accept RPC + drops legacy table/RPC.

---

## 9. Configuration Notes

- `PUBLIC_APP_URL` (or `NEXT_PUBLIC_APP_URL`) is used to build the `redirectTo`.
- Add `${APP_URL}/api/auth/accept-invite` to Supabase Auth → URL Configuration →
  Redirect URLs.
- Invite/magic-link emails are sent by Supabase Auth's configured SMTP/mailer,
  not the app's `getEmailProvider()`. Configure SMTP + the Invite/Magic Link
  email templates in the Supabase dashboard for production.

---

## 10. Staff Linkage (unchanged)

Accepting an invite creates only a `tenant_members` row. Staff profiles
(`staff_profiles`) remain a separate concept linked to a member via
`linkStaffAccountAction` / `tenant_member_id`. Linking is a deliberate manual
step, not part of acceptance.
