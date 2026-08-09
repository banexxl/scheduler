# Mobile, Accessibility & UX Consistency Audit

Milestone 10.4 — Completed August 2026.

---

## 1. Routes Audited

### Business Routes

| Route | Mobile | Accessibility | Status |
|-------|:------:|:-------------:|--------|
| `/[tenantSlug]/dashboard` | ✓ | ✓ | Pass — grid responsive |
| `/[tenantSlug]/calendar` | ✓ | ✓ | Pass — agenda fallback |
| `/[tenantSlug]/appointments` | ✓ | ✓ | Pass — table scrollable |
| `/[tenantSlug]/appointments/today` | ✓ | ✓ | Pass |
| `/[tenantSlug]/customers` | ✓ | ✓ | Pass — table scrollable, form wraps |
| `/[tenantSlug]/services` | ✓ | ✓ | Pass |
| `/[tenantSlug]/resources` | ✓ | ✓ | Pass |
| `/[tenantSlug]/locations` | ✓ | ✓ | Pass |
| `/[tenantSlug]/packages` | ✓ | ✓ | Pass |
| `/[tenantSlug]/reviews` | ✓ | ✓ | Pass |
| `/[tenantSlug]/waitlist` | ✓ | ✓ | Pass |
| `/[tenantSlug]/settings/*` | ✓ | ✓ | Pass — forms full-width |

### Customer Routes

| Route | Mobile | Accessibility | Status |
|-------|:------:|:-------------:|--------|
| `/customer` | ✓ | ✓ | Pass — max-width container, responsive padding |

### Public Routes

| Route | Mobile | Accessibility | Status |
|-------|:------:|:-------------:|--------|
| `/book/[tenantSlug]` | ✓ | ✓ | Pass — mobile-first design |
| `/book/[tenantSlug]/portal` | ✓ | ✓ | Pass |
| `/manage-appointment/[token]` | ✓ | ✓ | Pass |
| `/book/[tenantSlug]/review/[token]` | ✓ | ✓ | Pass |
| `/book/[tenantSlug]/waitlist/[token]` | ✓ | ✓ | Pass |

---

## 2. Mobile Navigation — Major Fix

### Before
- Business layout had **no navigation links** — only AppBar with tenant name, role chip, email, sign out
- AppBar overflowed on narrow viewports (chip + email + button in single row)
- Users had no way to navigate between sections on mobile

### After
- **Desktop:** AppBar with inline nav links (Dashboard, Calendar, Appointments, etc.)
- **Mobile:** Hamburger button → full navigation drawer
- Active route highlighted
- Drawer closes on navigation
- Touch targets 48px minimum (ListItemButton)
- Email/role/sign out accessible in drawer footer

---

## 3. Responsive Patterns

| Pattern | Desktop | Mobile |
|---------|---------|--------|
| Business navigation | Inline buttons in AppBar | Hamburger → Drawer |
| Data tables | Full table | Horizontal scroll container |
| Forms | Inline fields + actions | Fields wrap, full-width |
| Page headers | Flex row with actions | Flex-wrap |
| Dashboard grid | Multi-column | Single column stack |
| Confirm dialogs | Centered dialog | Full-screen |
| Container padding | 24px | 12px |

---

## 4. Accessibility

### Landmarks
- `<header>` — AppBar
- `<nav aria-label="Business navigation">` — desktop inline nav
- `<nav aria-label="Business sections">` — mobile drawer list
- `<main>` — content container

### ARIA Labels
- Hamburger: `aria-label="Open navigation menu"`
- Close drawer: `aria-label="Close navigation"`
- Loading states: `role="status" aria-label="Loading content"`
- Confirm dialog: `aria-labelledby`, `aria-describedby`

### Keyboard
- Drawer: focus trap, escape to close
- Dialog: focus trap, escape to close, autoFocus on confirm
- Nav links: standard keyboard navigation
- Forms: tab order preserved

### Color Independence
- StatusChip always shows text label (never color-only)
- Appointment status uses Chip with visible label text
- Error/success states use Alert with icon + text

---

## 5. Reusable UI Components Created

| Component | Location | Purpose |
|-----------|----------|---------|
| `BusinessShell` | `features/business/components/business-shell.tsx` | Responsive AppBar + navigation drawer |
| `LoadingState` | `components/ui/loading-state.tsx` | Skeleton (lists) or spinner (actions) with role="status" |
| `EmptyState` | `components/ui/empty-state.tsx` | Consistent empty list messaging + CTA |
| `StatusChip` | `components/ui/status-chip.tsx` | Color-mapped chip that always shows text |
| `ConfirmDialog` | `components/ui/confirm-dialog.tsx` | Destructive action confirmation, fullScreen mobile |

---

## 6. Error Boundaries

| File | Behavior |
|------|----------|
| `app/error.tsx` | Client boundary — retry button, no stack trace |
| `app/global-error.tsx` | Root layout fallback — minimal HTML |
| `app/not-found.tsx` | Safe 404 — no resource enumeration |

---

## 7. Touch Targets

- Navigation drawer items: 48px min height
- Hamburger/close buttons: IconButton (44px default)
- Form buttons: MUI default (36px+ with padding)
- Table action links: standard link touch area

---

## 8. Tables on Mobile

- Customer list: `overflowX: "auto"` wrapper
- Appointment list: `TableContainer` (Paper wrapper with scroll)
- Platform billing tables: horizontal scroll

No tables cause page-level horizontal overflow.

---

## 9. Dialogs on Mobile

- `ConfirmDialog`: `fullScreen` on `sm` breakpoint down
- Focus trap active
- Escape closes
- Clear cancel/confirm actions with consistent button order

---

## 10. Forms

- Search forms use `flexWrap: "wrap"` — inputs stack on mobile
- Settings forms use Paper containers with responsive padding
- All inputs have visible labels
- Required fields use Yup validation with inline error messages
- Submit buttons clearly labeled

---

## 11. Remaining Minor Issues (Documented)

| Issue | Severity | Notes |
|-------|----------|-------|
| No per-route card view for tables on narrow mobile | Low | Horizontal scroll is acceptable; card view deferred |
| No bottom sticky CTA on public booking | Low | Content scrolls naturally |
| Chart labels may clip at 320px | Low | Numeric summaries remain visible |
| No `prefers-reduced-motion` override | Low | MUI handles most transitions |
| Full screen-reader testing not performed | Low | Landmarks and labels added; full AT testing requires dedicated tooling |

---

## 12. Confirmed Invariants

- ✓ No known major mobile overflow remains
- ✓ No known keyboard trap remains
- ✓ Statuses do not rely on color only (always text labels)
- ✓ Destructive actions have ConfirmDialog available
- ✓ Public booking remains mobile-first
- ✓ Customer account routes are usable on mobile
- ✓ No known RSC/hydration runtime warning introduced
- ✓ No business logic was intentionally changed
