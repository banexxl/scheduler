# Server/Client Page Architecture

Project convention established August 2026.

---

## Convention

Every App Router route follows:

```
page.tsx       → Server Component (auth, data, DTOs)
client-page.tsx → Client Component (interactive UI)
```

---

## Server `page.tsx` Rules

1. **No `"use client"`** — page.tsx is always a Server Component
2. **Auth and authorization** happen here (requireUser, requireTenantMember, requireTenantRole, requirePlatformAdmin)
3. **Data fetching** happens here (service queries, DB calls)
4. **DTO preparation** — transform raw data into serializable plain objects
5. **Redirects and notFound()** — access control decisions
6. **Renders client-page.tsx** with serializable props

Example:

```tsx
// page.tsx
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getData } from "@/features/example/services/queries";
import ClientPage from "./client-page";

export default async function ExamplePage({ params }) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantMember(tenantSlug);
  const data = await getData(tenant.id);
  return <ClientPage tenantSlug={tenantSlug} data={data} />;
}
```

---

## Client `client-page.tsx` Rules

1. **Must start with `"use client"`**
2. Contains all interactive UI: hooks, state, events, dialogs, forms, icons
3. Imports MUI icons, next/link, and component references here
4. Never performs authentication or data fetching (except via server actions)

Example:

```tsx
// client-page.tsx
"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";

export default function ClientPage({ tenantSlug, data }) {
  return (
    <Button component={Link} href={`/${tenantSlug}/new`} startIcon={<AddIcon />}>
      Create
    </Button>
  );
}
```

---

## Serializable Props (Server → Client)

Allowed:
- `string`, `number`, `boolean`, `null`
- Plain objects `{}`
- Arrays `[]`
- ISO date strings

NOT allowed:
- Functions, callbacks
- React component constructors (`Link`, icons)
- Class instances
- `Date` objects
- `Map`, `Set`, `Symbol`
- Supabase clients
- Promises

---

## MUI `component` Prop

**Bad** (in server page.tsx):
```tsx
import Link from "next/link";
<Button component={Link} href="/foo">Click</Button>
```

**Good** (in server page.tsx — uses string):
```tsx
<Button component="a" href="/foo">Click</Button>
```

**Good** (in client-page.tsx — component reference is fine client-side):
```tsx
"use client";
import Link from "next/link";
<Button component={Link} href="/foo">Click</Button>
```

---

## Icon Handling

Icons are React components (functions). They cannot cross the server/client boundary.

**Bad** (server page.tsx):
```tsx
import AddIcon from "@mui/icons-material/Add";
<ClientPage icon={AddIcon} />  // Function reference!
```

**Good** (client-page.tsx imports icons directly):
```tsx
"use client";
import AddIcon from "@mui/icons-material/Add";
<Button startIcon={<AddIcon />}>Add</Button>
```

---

## Server Actions

Server actions are the exception — they CAN be passed from server to client because they're marked `"use server"`.

However, prefer having the client component import server actions directly:

```tsx
"use client";
import { createAction } from "@/features/example/actions/create";
```

---

## When `client-page.tsx` Is NOT Needed

Simple server pages that only display static data with MUI layout components (Typography, Box, Paper, Table) and use `component="a"` for links are fine without a client counterpart.

These pages have no interactivity, no icons, no callbacks, and no `component={ReactComponent}`.

---

## Anti-Patterns

| Pattern | Problem | Solution |
|---------|---------|----------|
| `'use client'` in page.tsx | Loses server rendering, auth | Separate into client-page.tsx |
| `component={Link}` in server page | Function reference | Use `component="a"` or move to client |
| Icon in server props | Function reference | Import in client component |
| `onClick` in server page | Function reference | Move to client component |
| `sx: { color: (theme) => ... }` passed from server | Function in sx | Define sx client-side |
| `JSON.stringify(fn)` | Hack | Fix the boundary correctly |
| `as any` to silence | Hides real issue | Fix the boundary correctly |
