/**
 * Integration Test Fixtures & Helpers — Milestone 10.5.
 *
 * Deterministic fixture generators for integration tests.
 * Uses unique prefixes per test run to avoid collision.
 * Designed for use with Supabase admin client in test environment.
 */

// ─── Environment Guard ───────────────────────────────────────────────────────

const TEST_MODE = process.env.E2E_TEST_MODE === "true" || process.env.NODE_ENV === "test";

export function assertTestEnvironment(): void {
  if (!TEST_MODE) {
    throw new Error(
      "Integration tests require E2E_TEST_MODE=true or NODE_ENV=test. " +
      "This guard prevents accidental execution against production."
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const productionPatterns = ["scheduler.com", "scheduler.io", "production"];
  for (const pattern of productionPatterns) {
    if (appUrl.includes(pattern)) {
      throw new Error(
        `Integration tests detected production URL pattern '${pattern}' in NEXT_PUBLIC_APP_URL. Aborting.`
      );
    }
  }
}

// ─── Run ID ──────────────────────────────────────────────────────────────────

let _runId: string | null = null;

export function getTestRunId(): string {
  if (!_runId) {
    _runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return _runId;
}

// ─── Fixture Generators ──────────────────────────────────────────────────────

export function testTenantSlug(label: string): string {
  return `e2e-${label}-${getTestRunId()}`.slice(0, 60);
}

export function testEmail(label: string): string {
  return `${label}-${getTestRunId()}@test.localhost`;
}

export function testCustomerName(label: string): string {
  return `Test Customer ${label} ${getTestRunId().slice(0, 8)}`;
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

/**
 * Returns a local date string N days from now (YYYY-MM-DD).
 * Never returns a past date.
 */
export function futureLocalDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(daysFromNow, 1));
  return date.toISOString().split("T")[0]!;
}

/**
 * Returns a time string for testing (HH:MM).
 */
export function testTimeSlot(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// ─── Actor Fixtures ──────────────────────────────────────────────────────────

export type TestActor = {
  email: string;
  password: string;
  label: string;
};

export function createTestActors() {
  const runId = getTestRunId();
  return {
    tenantOwnerA: {
      email: `owner-a-${runId}@test.localhost`,
      password: "TestPass123!OwnerA",
      label: "Tenant A Owner",
    },
    tenantStaffA: {
      email: `staff-a-${runId}@test.localhost`,
      password: "TestPass123!StaffA",
      label: "Tenant A Staff",
    },
    tenantOwnerB: {
      email: `owner-b-${runId}@test.localhost`,
      password: "TestPass123!OwnerB",
      label: "Tenant B Owner",
    },
    customerAccountA: {
      email: `customer-a-${runId}@test.localhost`,
      password: "TestPass123!CustomerA",
      label: "Customer Account A",
    },
    customerAccountB: {
      email: `customer-b-${runId}@test.localhost`,
      password: "TestPass123!CustomerB",
      label: "Customer Account B",
    },
  };
}

// ─── Internal API Helper ─────────────────────────────────────────────────────

export function getInternalApiHeaders(secret: string): Record<string, string> {
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
    "x-request-id": `test-${getTestRunId()}`,
  };
}

export function getInvalidInternalApiHeaders(): Record<string, string> {
  return {
    Authorization: "Bearer invalid-wrong-secret",
    "Content-Type": "application/json",
  };
}
