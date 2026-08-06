import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const testTenantId = process.env.TEST_SELF_SERVICE_TENANT_ID;
const testAppointmentId = process.env.TEST_SELF_SERVICE_APPOINTMENT_ID;
const testOwnerJwt = process.env.TEST_SELF_SERVICE_OWNER_JWT;
const testOwnerEmail = process.env.TEST_SELF_SERVICE_OWNER_EMAIL;
const testOwnerPassword = process.env.TEST_SELF_SERVICE_OWNER_PASSWORD;
const strictRequired = process.env.SELF_SERVICE_INTEGRATION_REQUIRED === "1";

const hasBaseEnv = Boolean(supabaseUrl && anonKey);
const hasPrivilegedEnv = Boolean(
     supabaseUrl
     && anonKey
     && serviceRoleKey
     && testTenantId
     && testAppointmentId
     && (testOwnerJwt || (testOwnerEmail && testOwnerPassword))
);

if (strictRequired && !hasPrivilegedEnv) {
     throw new Error(
          "SELF_SERVICE_INTEGRATION_REQUIRED=1 but privileged test env is incomplete. "
          + "Provide TEST_SELF_SERVICE_TENANT_ID, TEST_SELF_SERVICE_APPOINTMENT_ID, "
          + "and either TEST_SELF_SERVICE_OWNER_JWT or TEST_SELF_SERVICE_OWNER_EMAIL/TEST_SELF_SERVICE_OWNER_PASSWORD."
     );
}

const describeIfBase = hasBaseEnv ? describe : describe.skip;
const describeIfPrivileged = hasPrivilegedEnv ? describe : describe.skip;

async function resolveOwnerAccessToken(): Promise<string> {
     if (testOwnerJwt) {
          return testOwnerJwt;
     }

     const authClient = createClient(supabaseUrl!, anonKey!, {
          auth: {
               autoRefreshToken: false,
               persistSession: false,
          },
     });

     const { data, error } = await authClient.auth.signInWithPassword({
          email: testOwnerEmail!,
          password: testOwnerPassword!,
     });

     if (error || !data.session?.access_token) {
          throw new Error("Unable to sign in integration owner for self-service tests");
     }

     return data.session.access_token;
}

describeIfBase("self-service integration: RLS surface", () => {
     it("public/anon cannot read appointment_access_tokens", async () => {
          const anon = createClient(supabaseUrl!, anonKey!, {
               auth: {
                    autoRefreshToken: false,
                    persistSession: false,
               },
          });

          const { error } = await anon
               .from("appointment_access_tokens")
               .select("id")
               .limit(1);

          expect(error).not.toBeNull();
     });

     it("public/anon cannot read appointment_customer_actions", async () => {
          const anon = createClient(supabaseUrl!, anonKey!, {
               auth: {
                    autoRefreshToken: false,
                    persistSession: false,
               },
          });

          const { error } = await anon
               .from("appointment_customer_actions")
               .select("id")
               .limit(1);

          expect(error).not.toBeNull();
     });
});

describeIfPrivileged("self-service integration: token rotation and active-token race", () => {
     it("rotation leaves at most one active token for appointment/purpose", async () => {
          const ownerAccessToken = await resolveOwnerAccessToken();

          const authenticated = createClient(supabaseUrl!, anonKey!, {
               auth: {
                    autoRefreshToken: false,
                    persistSession: false,
               },
               global: {
                    headers: {
                         Authorization: `Bearer ${ownerAccessToken}`,
                    },
               },
          });

          const tokenHashA = "a".repeat(64);
          const tokenHashB = "b".repeat(64);

          const reqA = authenticated.rpc("rotate_appointment_access_token", {
               p_tenant_id: testTenantId,
               p_appointment_id: testAppointmentId,
               p_token_hash: tokenHashA,
               p_token_prefix: "diagAAAAAA",
               p_expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
               p_token_ciphertext: "x",
               p_token_iv: "y",
               p_token_auth_tag: "z",
               p_encryption_key_version: 1,
               p_revocation_reason: "integration_test_a",
          });

          const reqB = authenticated.rpc("rotate_appointment_access_token", {
               p_tenant_id: testTenantId,
               p_appointment_id: testAppointmentId,
               p_token_hash: tokenHashB,
               p_token_prefix: "diagBBBBBB",
               p_expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
               p_token_ciphertext: "x",
               p_token_iv: "y",
               p_token_auth_tag: "z",
               p_encryption_key_version: 1,
               p_revocation_reason: "integration_test_b",
          });

          const settled = await Promise.allSettled([reqA, reqB]);
          const successCount = settled.filter((item) => item.status === "fulfilled").length;
          expect(successCount).toBeGreaterThan(0);

          const admin = createClient(supabaseUrl!, serviceRoleKey!, {
               auth: {
                    autoRefreshToken: false,
                    persistSession: false,
               },
          });

          const { data, error } = await admin
               .from("appointment_access_tokens")
               .select("id")
               .eq("tenant_id", testTenantId)
               .eq("appointment_id", testAppointmentId)
               .eq("purpose", "manage_appointment")
               .is("revoked_at", null);

          expect(error).toBeNull();
          expect((data ?? []).length).toBeLessThanOrEqual(1);
     });
});
