# Auth Feature

Email/password and Google OAuth authentication for business owners and platform users.

## Structure

- `actions/` — Server Actions: `login`, `register`, `logout`, `google-login`, `forgot-password`, `update-password`
- `components/` — Client forms (MUI + Formik)
- `schemas/` — Yup validation schemas
- `services/` — `resolve-login-destination`, `resolve-user-identity`
- `types/` — `AuthActionResult`

## Login flow

1. `login-form.tsx` submits `FormData` to `loginAction`.
2. `loginAction` validates with `loginSchema`, calls `supabase.auth.signInWithPassword`.
3. On success, `resolveLoginDestination(user)` picks the destination (platform / tenant / customer portal / create-business).
4. Session cookies are refreshed by the root middleware (`proxy.ts`) on subsequent requests.

Local and production point at the **same hosted Supabase project**, so the auth backend is identical across environments.

## Troubleshooting: "can't log in on localhost but prod works"

Work through these in order. The first one has bitten us before.

### 1. Antivirus blocking Node (most common local-only cause)

The antivirus has repeatedly blocked/quarantined the local Node process, which breaks localhost auth (requests to the dev server or Supabase never complete cleanly) even though the exact same credentials work in production.

**Fix:** Allowlist Node / the dev server in the antivirus (or temporarily disable it), then restart `npm run dev`. If login works in prod but not on `http://localhost:3000` and nothing in the code changed, suspect the antivirus first.

### 2. OAuth-only account

If the account was created via **Continue with Google**, it has no password set, so `signInWithPassword` will always reject it. Set a password via the Supabase Dashboard (Authentication → Users) or the "Forgot password?" flow, then log in with email + password.

### 3. Session cookie not persisting (silent bounce back to /login)

If login shows no error but returns you to the login page, it's a cookie/session issue, not credentials:

- Confirm `http://localhost:3000` and `http://localhost:3000/api/auth/callback` are in Supabase Auth → URL Configuration (Site URL / Redirect URLs).
- Try an incognito window or clear cookies for `localhost` — a stale Supabase cookie makes `getUser()` fail silently.

### 4. Missing/incorrect env vars

`.env` should mirror `.env.example`. Key values for auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`.
