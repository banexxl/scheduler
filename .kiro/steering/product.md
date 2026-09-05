---
inclusion: always
---

# Product Overview

Multi-tenant scheduling SaaS. Each tenant gets:

- Public booking website
- Backoffice
- Customers
- Staff
- Locations
- Branding
- Annual subscription

## Core Principles

- One Next.js application
- Global authentication
- Tenant isolation through Supabase RLS
- Feature-first architecture

## Documentation Map

- Foundational rules: `.kiro/steering/` (always applied)
- Feature specifications: `.kiro/specs/features/` (reference before implementing a feature)
- Architecture decisions: `.kiro/decisions/`
- Investigations and reports: `.kiro/reports/`

When implementing a feature, read the matching feature spec in
`.kiro/specs/features/` first, then follow the coding and security standards.
