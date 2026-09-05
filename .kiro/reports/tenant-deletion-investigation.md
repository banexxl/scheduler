# Tenant & Auth User Deletion Investigation

**Milestone:** 13.1, Sections 18-19  
**Date:** August 6, 2026  
**Status:** Investigation Complete

---

## 1. Tenant Deletion

### Current Relationship Chain

```text
tenants.id
  ↓ ON DELETE CASCADE (expected)
  ├── tenant_members.tenant_id
  ├── locations.tenant_id
  ├── services.tenant_id
  ├── resources.tenant_id
  ├── appointments.tenant_id
  ├── tenant_booking_rules.tenant_id
  ├── tenant_public_booking_settings.tenant_id
  ├── tenant_onboarding.tenant_id
  ├── tenant_subscriptions.tenant_id
  ├── tenant_notification_settings.tenant_id
  ├── tenant_loyalty_settings.tenant_id
  ├── tenant_member_invitations.tenant_id
  ├── service_categories.tenant_id
  ├── resource_types.tenant_id
  ├── payment_intents.tenant_id
  ├── notification_outbox.tenant_id
  ├── customer_account_tenant_links.tenant_id
  └── ... (all tenant-scoped tables)
```

### Last-Owner Trigger Interaction

The `tenant_members_prevent_last_owner` trigger fires on DELETE/UPDATE of `tenant_members`.

**Key finding:** When deleting a tenant, if `tenant_members` has `ON DELETE CASCADE`, the CASCADE will attempt to delete the tenant's member rows. This fires the last-owner trigger BEFORE the last row is deleted.

**Behavior:**
- If the trigger fires during CASCADE deletion of tenant_members rows, it blocks the deletion of the last owner row, which blocks the entire tenant deletion.
- This means **you cannot simply `DELETE FROM tenants WHERE id = X`** if the trigger is active.

### Correct Approach for Tenant Deletion

1. **Delete tenant_members first** (bypassing the trigger via service-role or disabling the trigger in a transaction)
2. **Then delete the tenant** (CASCADE handles everything else)

Or use an RPC:

```sql
CREATE OR REPLACE FUNCTION admin_delete_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bypass last-owner trigger by deleting members first
  DELETE FROM public.tenant_members WHERE tenant_id = p_tenant_id;
  -- Then delete tenant (cascades to everything else)
  DELETE FROM public.tenants WHERE id = p_tenant_id;
END;
$$;
```

### Recommendation for Test Teardown

The `teardownTestTenant()` helper in integration fixtures already follows this pattern:
1. Delete `tenant_members` first
2. Then delete `tenants` (cascade)

This is safe for test environments. Production tenant deletion should be a separate Milestone 13.2 feature with confirmation workflow.

---

## 2. Auth User Deletion

### FK Relationships

```text
auth.users.id
  ├── tenants.created_by → ON DELETE SET NULL (expected)
  └── tenant_members.user_id → ON DELETE CASCADE (expected)
```

### Actual Behavior

**tenants.created_by:**
- If `ON DELETE SET NULL`: deleting the auth user sets `created_by = NULL` on any tenants they created. The tenant continues to exist.
- If `ON DELETE RESTRICT`: deleting the auth user fails if they created any tenants.

**tenant_members.user_id:**
- If `ON DELETE CASCADE`: deleting the auth user removes their membership from all tenants.
- This triggers the last-owner protection — if the user is the ONLY owner of a tenant, the CASCADE will be blocked by the trigger.

### Implications

1. **Cannot delete an auth user who is the last owner of any tenant.** The last-owner trigger on `tenant_members` will block the CASCADE from `auth.users` deletion.

2. **Safe deletion order:**
   - Remove user's ownership from all tenants (transfer to another owner, or delete tenants first)
   - Then delete the auth user

3. **For test environments:** The `deleteTestUser()` helper should only be called after all tenant memberships for that user have been removed.

### Recommendation

- Do NOT implement production user deletion in 13.1
- Document that user deletion requires ownership transfer first
- Test teardown should: tear down tenants → then delete users (if needed)
- Consider adding a `can_delete_user` check RPC for future admin panel

---

## 3. Summary of Findings

| Scenario | Behavior | Safe? |
|---|---|---|
| Delete tenant with multiple owners | CASCADE works after members deleted | Yes (via helper) |
| Delete tenant with single owner | Blocked by trigger unless members deleted first | Yes (via helper) |
| Delete auth user who is last owner | Blocked by trigger | No — requires ownership transfer first |
| Delete auth user who is non-owner member | CASCADE removes membership | Yes |
| Delete auth user who created a tenant | `created_by` set to NULL | Yes |

---

## 4. Action Items for 13.2

- [ ] Implement production tenant deletion workflow (confirmation, data export, grace period)
- [ ] Implement ownership transfer action (change last owner before account deletion)
- [ ] Add `can_delete_user` validation RPC
- [ ] Consider soft-delete pattern for tenants (status = "deleted") vs hard delete
