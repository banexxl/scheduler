# Business Settings

## Overview

The business settings page (`/${tenantSlug}/settings`) allows authorized members to view and update the business's basic information.

## Authorization

| Role | Access |
|------|--------|
| Owner | Full edit |
| Admin | Full edit |
| Manager | Read-only |
| Staff | Read-only |

Authorization is enforced both in the page (UI state) and in the Server Action (rejects update if role is not owner/admin).

## Database Migration

`supabase/migrations/20250805000002_add_tenant_settings_columns.sql`

Adds to `public.tenants`:
- `description text` — max 2000 chars
- `website_url text` — must be non-empty when set
- `default_language text NOT NULL DEFAULT 'en'` — one of: en, sr, ro
- `social_links jsonb NOT NULL DEFAULT '{}'::jsonb` — must be a JSON object

## Fields

### Editable Fields

| Field | DB Column | Validation |
|-------|-----------|------------|
| Business Name | `name` | Required, trim, 2–120 chars |
| Contact Email | `contact_email` | Optional, valid email, max 254 |
| Contact Phone | `contact_phone` | Optional, max 40 chars |
| Default Timezone | `default_timezone` | Required, IANA format |
| Default Currency | `default_currency` | Required, 3-letter supported code |
| Description | `description` | Optional, max 2000 chars |
| Website URL | `website_url` | Optional, absolute HTTP/HTTPS, max 500 |
| Default Language | `default_language` | Required, one of: en, sr, ro |
| Social Links | `social_links` | Per-platform HTTP/HTTPS URL, max 500 |

### Read-Only Fields

| Field | Reason |
|-------|--------|
| Business Slug | URL/SEO impact; dedicated change flow planned |

### Social Link Platforms

- Facebook
- Instagram
- LinkedIn
- TikTok
- YouTube

Stored as a single JSONB column, not individual columns.

## Slug Immutability

The slug is displayed read-only with URL previews. Changing a slug affects:
- Business dashboard URLs
- Public tenant subdomain
- Existing links
- Search indexing

A dedicated slug-change flow will be implemented in a future milestone.

## Form Sections

1. **Basic Information** — Name, slug (read-only), description
2. **Contact Information** — Email, phone, website URL
3. **Regional Defaults** — Timezone, currency, language
4. **Social Links** — One field per platform

## Server Action

`features/business/actions/update-business-settings.ts`

Steps:
1. Require authenticated user
2. Resolve tenant by slug
3. Verify active membership with owner or admin role
4. Validate with canonical Yup schema
5. Build explicit update payload (prevents mass assignment)
6. Update via Supabase `.update()` with RLS
7. Revalidate paths

### Explicit Update Payload

Only these columns are ever updated:
- `name`
- `contact_email`
- `contact_phone`
- `default_timezone`
- `default_currency`
- `description`
- `website_url`
- `default_language`
- `social_links`

Never updated by this action:
- `id`, `slug`, `status`, `created_by`, `created_at`

## URL Validation

Website URL and social link URLs must be:
- Absolute URLs (parsed with `new URL()`)
- Protocol `http:` or `https:` only
- Max 500 characters

Rejected:
- `javascript:` URLs
- Protocol-relative (`//...`)
- `ftp:`, `data:`, or other schemes

## RLS Review

The existing tenants RLS policy allows update by:
- Tenant owners (via `tenant_members` where `role = 'owner'`)
- Tenant admins (via `tenant_members` where `role = 'admin'`)

The Server Action additionally enforces the role check before calling `.update()`, providing defense in depth.

## Dirty State

- Save button disabled until form values differ from initial
- "Unsaved changes" indicator shown when dirty
- After successful save, form resets to new values (dirty clears)
- Browser navigation blocking deferred to future milestone

## Audit Logging

Business settings updates are not currently audit-logged automatically. The action uses the normal authenticated client, so an RPC or database trigger would be needed. This is deferred and documented.

## Security

- Server-side authentication required
- Server-side role enforcement (owner/admin only)
- RLS active on all queries
- Normal server client only (never admin)
- Explicit payload prevents mass assignment
- No slug update
- No status update
- No raw database errors exposed
- URL validation prevents unsafe schemes
- Social links individually validated

## File Structure

```
features/business/
├── actions/
│   └── update-business-settings.ts
├── components/
│   └── business-settings-form.tsx
├── schemas/
│   └── update-business-settings-schema.ts
└── services/
    └── get-business-settings.ts
```
