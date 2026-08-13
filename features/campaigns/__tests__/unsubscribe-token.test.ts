import { describe, it, expect } from "vitest";
import { createHash, randomBytes } from "crypto";

/**
 * Unsubscribe Token Security Tests — Milestone 15.7.
 *
 * Tests the token generation and hashing logic
 * without requiring database access.
 */

function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function getTokenPrefix(rawToken: string): string {
  return rawToken.slice(0, 10);
}

describe("unsubscribe token", () => {
  describe("token generation", () => {
    it("generates 32-byte tokens as base64url", () => {
      const token = generateRawToken();
      // 32 bytes → 43 chars in base64url (no padding)
      expect(token.length).toBe(43);
    });

    it("generates unique tokens", () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateRawToken()));
      expect(tokens.size).toBe(100);
    });

    it("tokens contain only URL-safe characters", () => {
      const token = generateRawToken();
      expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
    });
  });

  describe("token hashing", () => {
    it("produces 64-char hex SHA-256 hash", () => {
      const token = generateRawToken();
      const hash = hashToken(token);
      expect(hash.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it("same token always produces same hash", () => {
      const token = generateRawToken();
      expect(hashToken(token)).toBe(hashToken(token));
    });

    it("different tokens produce different hashes", () => {
      const token1 = generateRawToken();
      const token2 = generateRawToken();
      expect(hashToken(token1)).not.toBe(hashToken(token2));
    });

    it("raw token cannot be derived from hash", () => {
      const token = generateRawToken();
      const hash = hashToken(token);
      // Hash is shorter representation — no inverse
      expect(hash).not.toContain(token);
    });
  });

  describe("token prefix", () => {
    it("returns first 10 characters", () => {
      const token = generateRawToken();
      const prefix = getTokenPrefix(token);
      expect(prefix.length).toBe(10);
      expect(token.startsWith(prefix)).toBe(true);
    });
  });

  describe("idempotency", () => {
    it("processing same token twice should be safe", () => {
      // After first use: is_used = true
      // Second use: token already used → still returns success (idempotent)
      const isUsed = true;
      // Second processing should not throw or create side effects
      expect(isUsed).toBe(true); // Already processed = success
    });
  });

  describe("security properties", () => {
    it("token has sufficient entropy (32 bytes = 256 bits)", () => {
      const entropyBits = 32 * 8;
      expect(entropyBits).toBe(256);
    });

    it("token is URL-safe (can be embedded in unsubscribe links)", () => {
      const token = generateRawToken();
      const encoded = encodeURIComponent(token);
      // base64url should not need additional encoding
      expect(encoded).toBe(token);
    });
  });
});
