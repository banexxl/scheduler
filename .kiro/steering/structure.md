---
inclusion: always
---

# Project Structure

```
/
app/
components/
features/
hooks/
lib/
public/
schemas/
services/
styles/
types/
scripts/
proxy.ts
```

- No `src`.
- No `apps/web`.
- Single Next.js application.

## Routing

Route groups:

- (marketing)
- (auth)
- (tenant-backoffice)
- (account)
- (platform-admin)
- (site)

Public tenant sites are internally resolved through `(site)` and hostname
rewriting.
