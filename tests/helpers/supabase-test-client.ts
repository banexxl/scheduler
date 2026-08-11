/**
 * Supabase Test Client — Milestone 13.1.
 *
 * Creates admin and authenticated Supabase clients for integration testing.
 * Does NOT import "server-only" — safe for vitest environment.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Creates a service-role client that bypasses RLS.
 * Use only for test setup/teardown and verification.
 */
export function createTestAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Integration tests require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Creates an authenticated client for a specific user (via email/password sign-in).
 * This client respects RLS and carries the user's auth.uid().
 */
export async function createTestAuthenticatedClient(
  email: string,
  password: string
) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Integration tests require NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Auth failed for ${email}: ${error?.message ?? "no session"}`);
  }

  return { client, user: data.user, session: data.session };
}

/**
 * Creates a test user via service-role admin API.
 * Returns the user ID. Safe to call repeatedly (idempotent by email).
 */
export async function createTestUser(
  email: string,
  password: string
): Promise<string> {
  const admin = createTestAdminClient();

  // Check if already exists
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = (users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw new Error(`Failed to create test user ${email}: ${error.message}`);
  return data.user.id;
}

/**
 * Deletes a test user. Use in teardown.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const admin = createTestAdminClient();
  await admin.auth.admin.deleteUser(userId);
}
