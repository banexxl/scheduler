# Business Media

## Overview

The media system manages images for businesses, locations, and resources. It uses Supabase Storage with tenant-scoped paths and a metadata table for organization.

## Storage

- **Bucket:** `business-media`
- **Public read:** Yes (images will appear on public sites)
- **Write access:** Owner/admin only via Storage RLS policies
- **Path format:** `{tenantId}/{entityType}/{entityId}/{mediaRole}/{uuid}.{ext}`
- **Object names:** UUID-generated (never original filenames)

## Allowed Files

| Property | Constraint |
|----------|-----------|
| MIME types | image/jpeg, image/png, image/webp |
| Extensions | .jpg, .jpeg, .png, .webp |
| Logo size | Max 2 MB |
| Other images | Max 5 MB |
| Max dimensions | 6000 x 6000 |

## Media Roles

| Role | Targets | Behavior |
|------|---------|----------|
| `logo` | Business | Single image, replaces on upload |
| `cover` | Business, Location | Single image, replaces on upload |
| `profile` | Resource | Single image, replaces on upload |
| `gallery` | Business, Location, Resource | Multiple images, ordered |

## Database: `media_assets`

Stores metadata for all uploaded images. Actual files live in Supabase Storage.

Key columns: tenant_id, location_id (nullable), resource_id (nullable), media_role, storage_path, mime_type, size_bytes, width, height, alt_text, caption, is_primary, sort_order.

Partial unique indexes enforce single-image roles (one logo per tenant, one cover per tenant, etc.).

## Upload Flow

1. Client selects file, validates type/size/dimensions
2. Server Action (`prepare-media-upload`) verifies auth + role + target ownership, generates safe path
3. Client uploads to Storage via authenticated browser client
4. Server Action (`complete-media-upload`) records metadata, replaces old single-role images
5. On metadata failure: uploaded object is cleaned up

## Replacement Behavior

For single-image roles (logo, cover, profile):
- New image uploaded first
- Old metadata + storage object deleted after successful new upload
- No visible broken-image state during replacement

## Gallery Ordering

- `sort_order` column determines display order
- Move up/down controls in UI
- `reorder_media_assets` RPC updates atomically
- Verifies all assets belong to same tenant and collection

## Permissions

| Role | View | Upload | Replace | Reorder | Delete |
|------|------|--------|---------|---------|--------|
| Owner | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes |
| Manager | Yes | No | No | No | No |
| Staff | Yes | No | No | No | No |

## Routes

| Route | Purpose |
|-------|---------|
| `/${tenantSlug}/settings/media` | Business logo, cover, gallery |
| `/${tenantSlug}/locations/[id]/media` | Location cover + gallery |
| `/${tenantSlug}/resources/[id]/media` | Resource profile + gallery |

## Parent Deletion

Preferred strategy: Require media removal before deleting a location or resource.

This prevents Storage orphans since database cascades cannot delete Storage objects.

## Public URLs

Generated on demand from bucket + path. Not stored as full URLs in the database.

Helper: `features/media/services/get-media-public-url.ts`

## Security

- Storage RLS: path must start with user's tenant UUID
- Metadata RLS: owner/admin for writes, all members for reads
- No service-role key used
- No admin client
- UUID object names (no filename leakage)
- MIME and size validated both client-side and at bucket level

## Deferred

- Public site rendering
- Image cropping/optimization
- Video uploads
- AI image generation
- CDN transformations
- Drag-and-drop upload
- Background orphan cleanup
