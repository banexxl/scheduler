import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
     decryptAppointmentAccessToken,
     encryptAppointmentAccessToken,
     generateAppointmentAccessToken,
     getAppointmentTokenPrefix,
     hashAppointmentAccessToken,
} from "@/lib/security/appointment-token-crypto";

describe("appointment token crypto", () => {
     const originalKey = process.env.APPOINTMENT_TOKEN_ENCRYPTION_KEY;

     beforeEach(() => {
          process.env.APPOINTMENT_TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
     });

     afterEach(() => {
          if (originalKey === undefined) {
               delete process.env.APPOINTMENT_TOKEN_ENCRYPTION_KEY;
               return;
          }
          process.env.APPOINTMENT_TOKEN_ENCRYPTION_KEY = originalKey;
     });

     it("generates high-entropy url-safe tokens", () => {
          const token = generateAppointmentAccessToken();
          expect(token.length).toBeGreaterThanOrEqual(43);
          expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
     });

     it("hashes deterministically and returns 64-char hex", () => {
          const token = "sample-token";
          const h1 = hashAppointmentAccessToken(token);
          const h2 = hashAppointmentAccessToken(token);

          expect(h1).toBe(h2);
          expect(h1).toMatch(/^[a-f0-9]{64}$/);
     });

     it("different tokens produce different hashes", () => {
          const h1 = hashAppointmentAccessToken("token-a");
          const h2 = hashAppointmentAccessToken("token-b");
          expect(h1).not.toBe(h2);
     });

     it("encrypts and decrypts token round trip", () => {
          const rawToken = generateAppointmentAccessToken();
          const encrypted = encryptAppointmentAccessToken(rawToken, 1);
          const decrypted = decryptAppointmentAccessToken(encrypted);

          expect(decrypted).toBe(rawToken);
     });

     it("rejects tampered ciphertext/auth tag", () => {
          const rawToken = generateAppointmentAccessToken();
          const encrypted = encryptAppointmentAccessToken(rawToken, 1);

          const rawCiphertext = Buffer.from(encrypted.ciphertext, "base64url");
          expect(rawCiphertext.length).toBeGreaterThan(0);
          rawCiphertext[0] = (rawCiphertext[0] ?? 0) ^ 0xff;

          const tampered = {
               ...encrypted,
               ciphertext: rawCiphertext.toString("base64url"),
          };

          expect(() => decryptAppointmentAccessToken(tampered)).toThrow();
     });

     it("rejects decryption with wrong key", () => {
          const rawToken = generateAppointmentAccessToken();
          const encrypted = encryptAppointmentAccessToken(rawToken, 1);

          process.env.APPOINTMENT_TOKEN_ENCRYPTION_KEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

          expect(() => decryptAppointmentAccessToken(encrypted)).toThrow();
     });

     it("creates non-authoritative diagnostic prefixes", () => {
          const token = generateAppointmentAccessToken();
          const prefix = getAppointmentTokenPrefix(token);

          expect(prefix.length).toBe(10);
          expect(token.startsWith(prefix)).toBe(true);
     });
});
