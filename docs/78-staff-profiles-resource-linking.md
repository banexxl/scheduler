# Staff Profiles & Resource Linking

Milestone 12.2 — Completed August 2026.

---

## 1. Domain Model

```
tenant_member = dashboard access (authorization)
resource      = bookable entity (scheduling)
staff_profile = optional identity link between them
```

These are separate concepts:
- A member does NOT automatically become bookable
- A resource does NOT require a login
- Non-human resources have no staff profile

---

## 2. Staff Profile Table

| Field | Purpose |
|-------|---------|
| `resource_id` | The scheduling resource (required) |
| `tenant_member_id` | Linked account (optional, NULL = no login) |
| `display_name` | Public presentation name |
| `job_title` | Presentation only, never grants auth |
| `is_active` | Controls new bookings |
| `is_public` | Controls public visibility |

---

## 3. Constraints

- One profile per resource (unique)
- One profile per linked member (partial unique, non-null only)
- Tenant consistency trigger (resource + member must belong to same tenant)
- Cross-tenant linking rejected at DB level

---

## 4. Separation Guarantees

| Action | Effect on Other Side |
|--------|---------------------|
| Remove team member | Resource remains, bookings continue |
| Unlink account | Staff profile stays active |
| Deactivate resource | Membership unchanged |
| Deactivate staff | Future appointments NOT cancelled (warning shown) |
| Rename staff | Historical appointment snapshots unchanged |

---

## 5. Own Schedule Access

Resolved server-side:
```
auth.uid() → tenant_member → staff_profile → resource_id
```

Browser cannot claim arbitrary resource ownership.

---

## 6. Public Privacy

Public DTO exposes only: displayName, jobTitle, bio, avatarUrl.
Never: userId, memberId, email, role, auth metadata.

Hidden resource names (`showResourceNames=false`) block staff identity from public booking.

---

## 7. Test Coverage: 20 tests

- Domain model (3), relationship separation (4)
- Auth vs presentation (2), tenant isolation (3)
- Public privacy (2), own schedule (1)
- Uniqueness (2), historical integrity (2), additional (1)
