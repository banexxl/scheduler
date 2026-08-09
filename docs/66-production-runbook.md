# Production Runbook

Operational reference for deploying and maintaining the scheduling application.

---

## 1. Deployment Procedure

### Initial Deploy

```bash
# 1. Configure production environment variables (hosting dashboard)
# 2. Apply database migrations
supabase db push --project-ref <PROJECT_REF>

# 3. Regenerate DB types (verify locally)
npm run db:types

# 4. Build and deploy
npm run build
# Deploy via hosting provider (Vercel, Railway, etc.)
```

### Subsequent Deploys

```bash
# 1. Apply any new migrations
supabase db push --project-ref <PROJECT_REF>

# 2. Deploy new build
git push  # or CI/CD trigger
```

---

## 2. Migration Procedure

### Before Migration
- Take database backup/snapshot (Supabase dashboard → Backups)
- Review migration SQL for destructive operations
- Verify migration locally with clean DB first

### Apply
```bash
supabase db push --project-ref <PROJECT_REF>
```

### After Migration
- Verify health endpoint: `GET /api/health/supabase`
- Run smoke tests on affected features
- Regenerate types if schema changed: `npm run db:types`

### Rollback
- Migrations are not automatically reversible
- Forward-fix preferred
- If critical: restore from pre-migration backup

---

## 3. Environment Configuration

### Required Production Variables

| Variable | Purpose | Secret |
|----------|---------|:------:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API endpoint | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | No |
| `NEXT_PUBLIC_APP_URL` | Production canonical URL | No |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Root domain (no protocol) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS bypass (server-only) | Yes |
| `APPOINTMENT_TOKEN_ENCRYPTION_KEY` | Token AES-256-GCM key | Yes |
| `NOTIFICATION_PROCESSOR_SECRET` | Internal API auth | Yes |
| `EMAIL_PROVIDER` | `nodemailer` for production | No |
| `SMTP_HOST` | SMTP server | No |
| `SMTP_PORT` | SMTP port (587) | No |
| `SMTP_USER` | SMTP username | Yes |
| `SMTP_PASS` | SMTP password | Yes |
| `NOTIFICATION_FROM_EMAIL` | Sender address | No |

### Optional (Polar Billing)

| Variable | Purpose | Secret |
|----------|---------|:------:|
| `POLAR_ACCESS_TOKEN` | Polar API | Yes |
| `POLAR_WEBHOOK_SECRET` | Webhook signature | Yes |
| `POLAR_ORGANIZATION_ID` | Org scope | No |
| `POLAR_SERVER` | sandbox/production | No |

---

## 4. Cron Job Setup

### Notification Processor
```
POST /api/internal/notifications/process
Authorization: Bearer <NOTIFICATION_PROCESSOR_SECRET>
Schedule: every 1-2 minutes
```

### Reminder Processor
```
POST /api/internal/reminders/process
Authorization: Bearer <NOTIFICATION_PROCESSOR_SECRET>
Schedule: every 1-2 minutes
```

### Waitlist Processor
```
POST /api/internal/waitlist/process
Authorization: Bearer <NOTIFICATION_PROCESSOR_SECRET>
Schedule: every 2-5 minutes
```

### Billing Webhook Processor (if Polar enabled)
```
POST /api/internal/billing/process-webhooks
Authorization: Bearer <BILLING_PROCESSOR_SECRET>
Schedule: every 2-5 minutes
```

---

## 5. Health Checks

| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /api/health` | Liveness | `200 {"status":"ok"}` |
| `GET /api/health/supabase` | DB readiness | `200 {"supabase":"connected"}` |

Configure external uptime monitor on `/api/health` (60s interval recommended).

---

## 6. Log Inspection

- Logs emitted to stdout/stderr (structured JSON in production)
- Access via hosting provider log viewer
- Filter by: `level`, `event`, `tenantId`, `requestId`
- Error logs contain correlation `requestId` for tracing

### Key Events to Monitor
```
notification_process_route_failed
reminder_process_route_failed
waitlist_process_route_failed
slow_operation (durationMs > 1000)
config_validation_failed
health_supabase_failed
```

---

## 7. Common Incidents

### SMTP Delivery Failure

**Symptoms:** Notifications stuck in `pending`, `failed` status in outbox.

**Response:**
1. Check SMTP credentials in env
2. Verify SMTP host reachable from production network
3. Check sender domain SPF/DKIM
4. Process backlog: cron will retry automatically (up to 5 attempts)

**Emergency:** Set `EMAIL_PROVIDER=console` to stop send attempts while investigating.

### Notification Backlog

**Symptoms:** Growing pending count, slow processing.

**Response:**
1. Verify cron is running (check scheduler logs)
2. Verify processor secret matches
3. Increase batch size temporarily: `?batchSize=50`
4. Check for SMTP slowness

### Reminder Backlog

Same pattern as notifications. Reminders enqueue into notification outbox.

### Waitlist Expiration Backlog

Low urgency — entries/offers expire gracefully. Verify cron is running.

### Database Connectivity

**Symptoms:** `/api/health/supabase` returns 503.

**Response:**
1. Check Supabase dashboard status
2. Verify connection limits not exhausted
3. Check if migrations are running
4. Wait and retry (transient issue)

---

## 8. Secret Rotation

### NOTIFICATION_PROCESSOR_SECRET
1. Generate new secret
2. Update hosting environment variable
3. Update cron job configuration (new Bearer token)
4. Deploy/restart application
5. Old secret immediately invalid

### APPOINTMENT_TOKEN_ENCRYPTION_KEY
**CAUTION:** Rotating this key invalidates all existing encrypted appointment tokens.
1. Existing self-service links will become unreadable
2. New tokens generated with new key work fine
3. If rotation required: accept existing token invalidation or implement key versioning

### SUPABASE_SERVICE_ROLE_KEY
Rotate via Supabase dashboard → Settings → API. Update env immediately.

### POLAR_WEBHOOK_SECRET
Update in both Polar dashboard and application env simultaneously.

---

## 9. Backup & Recovery

### Database
- Supabase provides automated daily backups (Pro plan+)
- Point-in-time recovery available on Pro plan
- Manual backup: Supabase dashboard → Database → Backups

### Application
- Code: Git repository (full history)
- Deployment: hosting provider maintains previous deployments
- Rollback: redeploy previous Git commit/deployment

### Recovery Objectives
- RPO: Latest Supabase backup (daily or PITR)
- RTO: Manual restore + redeploy (~15-30 minutes)

---

## 10. Feature Kill Switches

| Feature | Disable Method |
|---------|---------------|
| Public booking | Tenant settings: `is_enabled = false` |
| Email notifications | Set `EMAIL_PROVIDER=console` or disable cron |
| Reminders | Disable reminder cron job |
| Review requests | Tenant notification settings |
| Waitlist | Disable waitlist cron job |
| Polar billing | Remove `POLAR_ACCESS_TOKEN` |

---

## 11. Supabase Auth Configuration

### Production Site URL
```
https://get-slot.app
```

### Redirect URLs (add all)
```
https://get-slot.app/auth/callback
https://get-slot.app/auth/confirm
https://get-slot.app/update-password
```

### Email Templates
Configure in Supabase dashboard → Authentication → Email Templates.
Update confirmation/reset links to use production domain.

---

## 12. DNS Configuration

### Required Records
```
A/CNAME  get-slot.app          → hosting provider
A/CNAME  www.get-slot.app      → hosting provider (redirect to apex)
CNAME    *.get-slot.app        → hosting provider (if subdomain routing enabled)
```

### Email (SPF/DKIM)
Configure per SMTP provider requirements for `NOTIFICATION_FROM_EMAIL` domain.

---

## 13. Storage (Supabase)

### Bucket: `business-media`
- Type: Public (read) with authenticated write policies
- Max file size: configured in upload action (5MB images)
- Allowed MIME: image/jpeg, image/png, image/webp
- Path structure: `{tenant_id}/{target}/{entity}/{role}/{uuid}.{ext}`

Verify bucket exists in production Supabase project before first media upload.
