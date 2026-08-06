import "server-only";

import {
     createCipheriv,
     createDecipheriv,
     createHash,
     createHmac,
     randomBytes,
} from "crypto";

const TOKEN_BYTES = 32;
const TOKEN_PREFIX_LENGTH = 10;

export type EncryptedAppointmentToken = {
     ciphertext: string;
     iv: string;
     authTag: string;
     keyVersion: number;
};

export function generateAppointmentAccessToken(): string {
     // 32 bytes => 256-bit token entropy encoded as URL-safe Base64.
     return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashAppointmentAccessToken(rawToken: string): string {
     return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function getAppointmentTokenPrefix(rawToken: string): string {
     return rawToken.slice(0, TOKEN_PREFIX_LENGTH);
}

function normalizeKeyMaterial(keyMaterial: string): Buffer {
     const trimmed = keyMaterial.trim();

     // Accept hex-encoded keys.
     if (/^[a-f0-9]{64}$/i.test(trimmed)) {
          return Buffer.from(trimmed, "hex");
     }

     // Accept base64/base64url-encoded keys.
     const asBase64 = trimmed.replace(/-/g, "+").replace(/_/g, "/");
     try {
          const decoded = Buffer.from(asBase64, "base64");
          if (decoded.length > 0) {
               return decoded;
          }
     } catch {
          // Fall through to UTF-8 handling.
     }

     // Last resort: treat as raw UTF-8 bytes.
     return Buffer.from(trimmed, "utf8");
}

export function getAppointmentTokenEncryptionKey(): Buffer {
     const keyMaterial = process.env.APPOINTMENT_TOKEN_ENCRYPTION_KEY;
     if (!keyMaterial || keyMaterial.trim().length === 0) {
          throw new Error("APPOINTMENT_TOKEN_ENCRYPTION_KEY is not configured");
     }

     const key = normalizeKeyMaterial(keyMaterial);
     if (key.length !== 32) {
          throw new Error("APPOINTMENT_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
     }

     return key;
}

export function encryptAppointmentAccessToken(
     rawToken: string,
     keyVersion = 1
): EncryptedAppointmentToken {
     const key = getAppointmentTokenEncryptionKey();
     const iv = randomBytes(12);
     const cipher = createCipheriv("aes-256-gcm", key, iv);

     const ciphertext = Buffer.concat([
          cipher.update(rawToken, "utf8"),
          cipher.final(),
     ]);

     const authTag = cipher.getAuthTag();

     return {
          ciphertext: ciphertext.toString("base64url"),
          iv: iv.toString("base64url"),
          authTag: authTag.toString("base64url"),
          keyVersion,
     };
}

export function decryptAppointmentAccessToken(payload: EncryptedAppointmentToken): string {
     const key = getAppointmentTokenEncryptionKey();

     const decipher = createDecipheriv(
          "aes-256-gcm",
          key,
          Buffer.from(payload.iv, "base64url")
     );

     decipher.setAuthTag(Buffer.from(payload.authTag, "base64url"));

     const plaintext = Buffer.concat([
          decipher.update(Buffer.from(payload.ciphertext, "base64url")),
          decipher.final(),
     ]);

     return plaintext.toString("utf8");
}

export function hashClientIp(ip: string): string {
     const key = getAppointmentTokenEncryptionKey();
     return createHmac("sha256", key).update(ip, "utf8").digest("hex");
}

export function hashRequestPayload(payload: unknown): string {
     return createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
}
