# Production Launch Checklist

Execute each item before going live. Mark complete when verified.

---

## Infrastructure

- [ ] Production hosting environment created
- [ ] Production Supabase project configured (separate from development)
- [ ] DNS A/CNAME records pointing to hosting
- [ ] SSL/HTTPS verified on production domain
- [ ] Wildcard SSL verified (if subdomain routing enabled)

## Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — production project URL
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — production anon key
- [ ] `NEXT_PUBLIC_APP_URL` — production domain (https://get-slot.app)
- [ ] `NEXT_PUBLIC_ROOT_DOMAIN` — production domain (get-slot.app)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — production service role key
- [ ] `APPOINTMENT_TOKEN_ENCRYPTION_KEY` — 32-byte key (backed up securely)
- [ ] `NOTIFICATION_PROCESSOR_SECRET` — generated secret
- [ ] `EMAIL_PROVIDER=nodemailer`
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — verified
- [ ] `NOTIFICATION_FROM_EMAIL` — verified sender address
- [ ] `POLAR_*` variables (if billing enabled)
- [ ] No localhost values remain
- [ ] No test/development secrets in production

## Database

- [ ] All migrations applied from clean state (`supabase db push`)
- [ ] Types regenerated and committed (`npm run db:types`)
- [ ] RLS smoke test: Tenant A cannot read Tenant B
- [ ] RLS smoke test: anon cannot read sensitive tables
- [ ] SECURITY DEFINER RPCs respond correctly
- [ ] Database backup configured (Supabase Pro plan)

## Authentication

- [ ] Supabase Auth Site URL set to production domain
- [ ] Redirect URLs added (callback, confirm, update-password)
- [ ] Email templates updated with production domain links
- [ ] OAuth provider configured (if applicable)
- [ ] Login/register flow verified end-to-end
- [ ] Password reset flow verified

## Storage

- [ ] `business-media` bucket exists in production
- [ ] Public read + authenticated write policies active
- [ ] Upload/display/delete smoke test passed

## Cron / Internal Processors

- [ ] Notification processor cron configured (every 1-2 min)
- [ ] Reminder processor cron configured (every 1-2 min)
- [ ] Waitlist processor cron configured (every 2-5 min)
- [ ] Billing processor cron configured (if Polar enabled)
- [ ] All crons use correct `Authorization: Bearer <secret>`
- [ ] Wrong/missing secret returns 401 (verified)

## Email

- [ ] SMTP connection verified (test email sent)
- [ ] SPF/DKIM configured for sender domain
- [ ] Booking confirmation email received correctly
- [ ] Reminder email received correctly
- [ ] Portal magic link email received with production URL
- [ ] Self-service manage link uses production URL
- [ ] Review request link uses production URL
- [ ] Waitlist offer link uses production URL

## Health & Monitoring

- [ ] `GET /api/health` returns 200
- [ ] `GET /api/health/supabase` returns 200
- [ ] External uptime monitor configured
- [ ] Production logs accessible (hosting log viewer)
- [ ] Structured JSON logging verified

## Security

- [ ] Security headers present (check response headers)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy configured
- [ ] Token routes: no-store, noindex verified
- [ ] robots.txt deployed and correct
- [ ] Open redirect protection verified (auth return URLs)
- [ ] No production secrets in repository

## Critical Smoke Tests

- [ ] Business login → dashboard → navigation
- [ ] Create appointment → confirm → complete
- [ ] Public booking → availability → book → confirmation
- [ ] Customer register → login → dashboard
- [ ] Appointment cancel → notification → slot released
- [ ] Appointment reschedule → notification → slot updated
- [ ] Review token → submit review
- [ ] Waitlist join → offer generation (on slot release)
- [ ] Customer portal magic link → session → history
- [ ] Package assign → credit reserve → consume
- [ ] Loyalty points awarded on completion (once only)

## Mobile

- [ ] Public booking page usable (390px viewport)
- [ ] Business navigation drawer works
- [ ] Customer dashboard accessible
- [ ] No horizontal overflow on major routes

## Build & Tests

- [ ] `npm run lint` — 0 errors
- [ ] `npm run type-check` — 0 errors
- [ ] `npm run test` — all pass
- [ ] `npm run build` — succeeds
- [ ] `npm run test:integration:required` — pass (against staging)
- [ ] Production build starts without errors (`npm run start`)

## Backup & Recovery

- [ ] Database backup verified (snapshot exists)
- [ ] Encryption key backed up securely
- [ ] Rollback procedure documented and tested
- [ ] Previous deployment accessible for quick rollback

---

## Go / No-Go

### Blockers (must resolve before launch)
- Production auth redirects broken
- Migration fails from clean DB
- Public booking cannot create appointment
- RLS cross-tenant data leak
- Cron processors publicly executable (no auth)
- SMTP cannot send
- Health endpoints failing
- Encryption key not backed up

### Accepted Risks (documented)
- In-memory rate limiter per-instance (not distributed)
- No MFA/2FA
- No full screen-reader certification
- No trigram customer search index
- Platform-admin UI development paused

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | |
| Owner | | | |
