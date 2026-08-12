# Tenant Branding & Public Booking Theme System — Milestone 14.4

## Architecture

```text
Tenant Backoffice → Branding Editor → Save Draft → Preview
                                                  → Publish → Published Config
                                                                    ↓
                                                         Public Theme Resolver
                                                                    ↓
                                              Public Booking / Portal / Self-Service / Review / Waitlist

/customer/* → Platform Customer Theme (NEVER inherits tenant branding)
```

---

## Database

**Migration:** `20260807000016_tenant_branding.sql`

**Table:** `tenant_branding_settings`
- `tenant_id` (FK → tenants, unique, CASCADE)
- `draft_config` JSONB
- `published_config` JSONB
- `draft_version` INTEGER (starts at 1, increments on save)
- `published_version` INTEGER (starts at 0, set to draft_version on publish)
- `published_at` TIMESTAMPTZ

**RLS:**
- Members can SELECT own branding
- Owner/admin can INSERT/UPDATE
- Anonymous cannot directly access (uses RPC for published only)

**RPCs:**
- `get_published_tenant_branding(slug)` — returns published config for anonymous/public use
- `publish_tenant_branding(tenant_id, actor_user_id, expected_draft_version)` — atomic publish with version check

---

## Branding Configuration

| Field | Type | Description |
|---|---|---|
| schemaVersion | 1 | Config version for forward compatibility |
| primaryColor | #RRGGBB | Primary brand color |
| accentColor | #RRGGBB | Secondary/accent color |
| backgroundColor | #RRGGBB | Page background |
| surfaceColor | #RRGGBB | Card/container background |
| appearance | light / dark | Color mode |
| fontPreset | modern / clean / friendly / elegant / classic | Font family selection |
| radiusPreset | square / soft / rounded | Border radius (4px / 10px / 18px) |
| heroLayout | minimal / image / centered | Booking page hero style |
| logoMediaId | UUID / null | Reference to media_assets |
| coverMediaId | UUID / null | Reference to media_assets |
| tagline | string / null | Short description (max 200 chars) |

---

## Draft / Publish Lifecycle

1. **Edit** — Changes stored in `draft_config`, `draft_version` incremented
2. **Preview** — Live preview in editor (draft only visible to authenticated tenant members)
3. **Publish** — Atomic copy of draft → published with version check
4. **Reset** — Copies published back to draft (discards unpublished changes)
5. **Default** — Tenants without branding records use `DEFAULT_BRANDING_CONFIG`

Version conflict protection: publishing requires `expected_draft_version` to match current.

---

## Theme Resolver

`resolvePublishedTenantTheme(tenantId)` → `ResolvedTenantTheme`

- Reads `published_config` from DB
- Falls back to defaults for missing/invalid fields
- Derives `textColor`, `mutedTextColor`, `borderColor` from background (accessibility)
- Maps presets to actual values (font family, border radius)
- Returns only render-safe DTO (no DB internals)

---

## Color Validation & Accessibility

- Colors validated as `#RRGGBB` or `#RGB` (normalized to 6-digit)
- WCAG contrast: `getContrastRatio()`, `meetsWcagAA()`, `meetsWcagAALarge()`
- Auto-derives foreground: `resolveForeground()` returns black or white based on luminance
- Muted text and border colors derived from background

---

## Public Surfaces Using Branding

- `/book/{tenantSlug}` — public booking
- `/book/{tenantSlug}/portal` — customer portal
- `/book/{tenantSlug}/review/{token}` — review submission
- `/book/{tenantSlug}/waitlist/{token}` — waitlist offers
- `/manage-appointment/{token}` — self-service (via tenant context)
- Payment return pages

---

## Branding Editor

- Located at `/{tenantSlug}/settings/branding`
- Desktop: side-by-side controls + live preview
- Mobile: stacked (controls then preview)
- Color pickers (native `type="color"`)
- Dropdown selects for presets
- Tagline text field (200 char max)
- Status chips (Published vN, Unpublished changes)
- Actions: Save Draft, Publish, Reset Draft

---

## Security

- No arbitrary CSS/JS/HTML
- Colors validated server-side (#RRGGBB only)
- URLs validated (https only for social links)
- Media IDs verified against tenant ownership (via existing RLS)
- Draft never exposed publicly
- Version conflict prevents stale overwrites
- JSONB injection prevented by validation layer

---

## Performance

- Single bounded query for published branding
- Theme memoized on client (no recreated per render)
- Cache-friendly (branding changes rarely)
- No N+1 queries

---

## Explicit Confirmations

- Branding is tenant-scoped
- Only owner/admin can modify
- Anonymous sees published only
- Draft doesn't affect live pages
- Publishing is atomic with version check
- Default theme works without branding record
- Missing media degrades gracefully
- No arbitrary CSS/JS
- Colors validated server-side
- `/customer/*` remains platform-themed
- Existing MUI foundation used (no new framework)
- No page builder implemented
