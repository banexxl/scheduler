import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  generateAppointmentAccessToken,
  hashAppointmentAccessToken,
  getAppointmentTokenPrefix,
} from "../appointment-token-crypto";

// Set test key for crypto operations
beforeAll(() => {
  // 64-char hex = 32 bytes
  process.env.APPOINTMENT_TOKEN_ENCRYPTION_KEY =
    "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
});

describe("appointment token crypto", () => {
  describe("generateAppointmentAccessToken", () => {
    it("generates URL-safe base64 token", () => {
      const token = generateAppointmentAccessToken();
      expect(token.length).toBeGreaterThan(0);
      // base64url characters only
      expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    });

    it("generates unique tokens", () => {
      const tokens = new Set(
        Array.from({ length: 100 }, () => generateAppointmentAccessToken())
      );
      expect(tokens.size).toBe(100);
    });
  });

  describe("hashAppointmentAccessToken", () => {
    it("produces consistent SHA-256 hex hash", () => {
      const token = "test-token-value";
      const hash1 = hashAppointmentAccessToken(token);
      const hash2 = hashAppointmentAccessToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it("different tokens produce different hashes", () => {
      const h1 = hashAppointmentAccessToken("token-a");
      const h2 = hashAppointmentAccessToken("token-b");
      expect(h1).not.toBe(h2);
    });

    it("raw token cannot be derived from hash", () => {
      const token = generateAppointmentAccessToken();
      const hash = hashAppointmentAccessToken(token);
      // Hash should not contain the token
      expect(hash).not.toContain(token);
    });
  });

  describe("getAppointmentTokenPrefix", () => {
    it("returns first 10 characters", () => {
      const token = "abcdefghijklmnop";
      expect(getAppointmentTokenPrefix(token)).toBe("abcdefghij");
      expect(getAppointmentTokenPrefix(token)).toHaveLength(10);
    });
  });
});
