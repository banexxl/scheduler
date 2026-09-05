# Customer Account

## Overview

The customer account area (`/account/*`) is a global space for any authenticated user.

It does NOT require:
- A `tenant_customers` relationship
- A `tenant_members` relationship
- Platform admin status

Any authenticated user can access their account area.

## Protection

Protected by `requireUser()` in the account layout.
Redirects to `/login` if unauthenticated.

## Routes

| Route | Purpose |
|-------|---------|
| `/account` | Account home |
| `/account/profile` | User profile |
| `/account/appointments` | Appointment history |
| `/account/businesses` | Connected businesses |
| `/account/reviews` | Reviews written |
| `/account/security` | Security settings |

## Layout Shell

Displays:
- "My Account" heading
- User email
- Sign out button

## Identity

- A new Auth user with no relationships lands at `/account`
- The account exists independent of any tenant relationship
- A user may be a customer of multiple tenants and manage them from this area
- Password changes are global (not tenant-specific)
