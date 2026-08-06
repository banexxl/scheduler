#!/usr/bin/env node

const required = [
     "NEXT_PUBLIC_SUPABASE_URL",
     "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
     "SUPABASE_SERVICE_ROLE_KEY",
     "TEST_SELF_SERVICE_TENANT_ID",
     "TEST_SELF_SERVICE_APPOINTMENT_ID",
];

const missing = required.filter((key) => !process.env[key] || process.env[key].trim().length === 0);

const hasJwt = Boolean(process.env.TEST_SELF_SERVICE_OWNER_JWT && process.env.TEST_SELF_SERVICE_OWNER_JWT.trim().length > 0);
const hasEmailPassword = Boolean(
     process.env.TEST_SELF_SERVICE_OWNER_EMAIL
     && process.env.TEST_SELF_SERVICE_OWNER_EMAIL.trim().length > 0
     && process.env.TEST_SELF_SERVICE_OWNER_PASSWORD
     && process.env.TEST_SELF_SERVICE_OWNER_PASSWORD.trim().length > 0
);

if (!hasJwt && !hasEmailPassword) {
     missing.push("TEST_SELF_SERVICE_OWNER_JWT or TEST_SELF_SERVICE_OWNER_EMAIL+TEST_SELF_SERVICE_OWNER_PASSWORD");
}

if (missing.length > 0) {
     console.error("Self-service integration env is incomplete.");
     for (const key of missing) {
          console.error(`- Missing: ${ key }`);
     }
     process.exit(1);
}

console.log("Self-service integration env check passed.");
