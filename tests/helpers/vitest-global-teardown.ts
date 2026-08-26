/**
 * Vitest Global Setup — wires test cleanup as a teardown hook.
 *
 * Vitest globalSetup functions can return a teardown callback that
 * runs after all test suites complete, regardless of individual
 * test outcomes.
 */

import { cleanupTestData } from "./global-test-cleanup";

export default function setup() {
  // Return teardown function — runs after all tests finish
  return async () => {
    await cleanupTestData();
  };
}
