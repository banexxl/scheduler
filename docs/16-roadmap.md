# Roadmap

## Completed

### Milestone 4.1 — Onboarding Redirect Logic

Updated post-authentication routing so new users are directed to business creation.

**Destination precedence:**
1. Platform admin → `/platform/dashboard`
2. Active tenant member → `/[tenantSlug]/dashboard`
3. Customer-only user → `/account`
4. New user (no relationships) → `/create-business`

`/create-business` is a protected placeholder. The actual onboarding form and `create_tenant()` RPC are deferred to Milestone 4.2.

## Planned

- Foundation
- Services
- Resources
- Availability
- Booking Engine
- Reviews
- Themes
- Payments
- Analytics
- AI Assistant
