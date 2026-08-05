# Authentication

## Identity Model

Authentication is global. One Supabase Auth account per person.

A single user may simultaneously be:
- A platform administrator
- A tenant owner/admin/manager/staff
- A customer of one or multiple tenants

Passwords belong to the global Auth account — a password change is not tenant-specific.

Database relationships determine roles:
```
auth.users
├── platform_admins
├── tenant_members
└── tenant_customers
```

No `profiles` table exists. Roles are never stored in Supabase Auth metadata.

## Authentication Flows

### Registration (`/register`)
- Email/password sign-up via `supabase.auth.signUp()`
- No tenant, member, or customer records are created
- Email confirmation required (configurable in Supabase dashboard)
- Redirect URL points to `/auth/callback`

### Login (`/login`)
- Email/password via `supabase.auth.signInWithPassword()`
- On success: resolves identity → redirects to appropriate destination
- Invalid credentials return generic message (never reveals email existence)

### Forgot Password (`/forgot-password`)
- Sends recovery email via `supabase.auth.resetPasswordForEmail()`
- Always shows neutral message regardless of email existence
- Recovery redirect: `/auth/callback?next=/update-password`

### Update Password (`/update-password`)
- Requires valid recovery or authenticated session
- Calls `supabase.auth.updateUser({ password })`
- Redirects through identity resolution on success

### Email Confirmation (`/auth/confirm`)
- Route handler that verifies OTP with `token_hash` and `type`
- Resolves destination after successful verification

### Auth Callback (`/auth/callback`)
- Exchanges authorization code for session
- Supports recovery links and future OAuth flows
- Validates `next` parameter (internal paths only)

### Logout
- Server Action calling `supabase.auth.signOut()`
- Redirects to `/login`
- Available in all protected layout shells

## Identity Resolution

After authentication, the system resolves the user's identity by querying:
1. `platform_admins` (active only)
2. `tenant_members` (active status, with tenant info)
3. `tenant_customers` count

## Post-Login Destination Precedence

1. **Platform administrator** → `/platform/dashboard`
2. **Exactly one active tenant membership** → `/app/[slug]/dashboard`
3. **Multiple active tenant memberships** → `/app` (workspace selector)
4. **No platform role or memberships** → `/account`

Only memberships where both `tenant_members.status = 'active'` AND `tenants.status = 'active'` are considered accessible.

## Workspace Selector (`/app`)

- Protected by `requireUser()`
- Lists all accessible workspaces (active tenant memberships)
- Shows tenant name and user's role
- Links to `/app/[slug]/dashboard`
- Redirects to `/account` if no memberships
- Auto-redirects if exactly one membership

## Protected Layouts

| Area | Guard | Behavior on failure |
|------|-------|-------------------|
| `/account/*` | `requireUser()` | Redirect to `/login` |
| `/platform/*` | `requirePlatformAdmin()` | 404 (not found) |
| `/app/[slug]/*` | `requireTenantMember(slug)` | 404 (not found) |
| `/app` | `requireUser()` | Redirect to `/login` |
| `/app/new` | `requireUser()` | Redirect to `/login` |

Unauthorized access to tenant/platform routes returns 404 to avoid revealing resource existence.

## Safe Redirects

All `next` parameters are validated by `getSafeRedirectPath()`:
- Must start with exactly one `/`
- No `//` prefix (protocol-relative)
- No protocol schemes
- No `javascript:` or `data:` URLs

## Supabase Dashboard Configuration

Required settings in your Supabase project dashboard:

### Auth → URL Configuration
- **Site URL**: `http://localhost:3000` (development)
- **Redirect URLs** (add all):
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - `http://localhost:3000/update-password`

### Auth → Email
- Enable email confirmations (recommended)
- Email templates should use `{{ .ConfirmationURL }}` which includes `token_hash`

### Confirmation Mechanism

This project uses **two** auth callback routes:

| Route | Mechanism | Used by |
|-------|-----------|---------|
| `/auth/confirm` | Token-hash OTP verification (`token_hash` + `type`) | Email confirmation links |
| `/auth/callback` | PKCE code exchange (`code`) | Password recovery, future OAuth |

- **Registration** sets `emailRedirectTo` to `/auth/callback` (Supabase sends a PKCE code link)
- **Password recovery** sets `redirectTo` to `/auth/callback?next=/update-password`
- Both routes validate cookies and redirect through identity resolution

### Production
- Update Site URL to production domain (e.g. `https://scheduler.example.com`)
- Add production redirect URLs:
  - `https://scheduler.example.com/auth/callback`
  - `https://scheduler.example.com/auth/confirm`
  - `https://scheduler.example.com/update-password`
- Configure custom SMTP for email delivery

## Environment Variables for Auth

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Full origin for auth callback URLs (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Hostname for future subdomain routing (e.g. `localhost:3000`) |

`NEXT_PUBLIC_APP_URL` is validated as an absolute URL. Trailing slash is stripped automatically.
Used by `getAppUrl()` helper to construct auth callback URLs safely via `new URL()`.

## Deferred Features

Not implemented in this milestone:
- OAuth providers (Google, GitHub, etc.)
- Magic links
- Phone authentication
- Multi-factor authentication
- Team invitations
- Customer registration with tenant
- Tenant creation/onboarding
- Account deletion
- Production email template customization
