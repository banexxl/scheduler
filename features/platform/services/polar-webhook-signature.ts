import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Polar Webhook Signature Verification.
 *
 * Polar uses Svix for webhook delivery. Svix signs with:
 * - Headers: svix-id, svix-timestamp, svix-signature
 * - Signature: HMAC-SHA256 over "{svix-id}.{svix-timestamp}.{body}"
 * - Secret: base64-decoded (secrets start with "whsec_")
 * - Signature header format: "v1,{base64-encoded-hmac}"
 *
 * Also supports legacy format where signature is plain HMAC of body.
 */

function decodeSecret(secret: string): Buffer {
     // Svix secrets start with "whsec_" prefix — strip it and base64-decode
     const cleaned = secret.trim();
     if (cleaned.startsWith("whsec_")) {
          return Buffer.from(cleaned.slice(6), "base64");
     }
     // Fallback: use as-is (utf8 key)
     return Buffer.from(cleaned, "utf8");
}

function verifySvixSignature(params: {
     rawBody: string;
     svixId: string | null;
     svixTimestamp: string | null;
     signatureHeader: string;
     secret: string;
}): boolean {
     const { rawBody, svixId, svixTimestamp, signatureHeader, secret } = params;

     if (!svixId || !svixTimestamp) return false;

     const secretBytes = decodeSecret(secret);
     const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

     const expectedSignature = createHmac("sha256", secretBytes)
          .update(signedContent, "utf8")
          .digest("base64");

     // Parse "v1,{base64}" format — may have multiple signatures
     const signatures = signatureHeader.split(" ").flatMap(part => {
          const trimmed = part.trim();
          if (trimmed.startsWith("v1,")) {
               return [trimmed.slice(3)];
          }
          return [];
     });

     for (const sig of signatures) {
          try {
               const sigBuffer = Buffer.from(sig, "base64");
               const expectedBuffer = Buffer.from(expectedSignature, "base64");
               if (sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer)) {
                    return true;
               }
          } catch {
               continue;
          }
     }

     return false;
}

function verifyLegacySignature(params: {
     rawBody: string;
     signatureHeader: string;
     secret: string;
}): boolean {
     const { rawBody, signatureHeader, secret } = params;

     // Legacy: plain HMAC-SHA256 of body
     const expectedHex = createHmac("sha256", secret)
          .update(rawBody, "utf8")
          .digest("hex")
          .toLowerCase();

     // Try to match various formats
     const candidates = signatureHeader
          .split(",")
          .map(p => p.trim())
          .filter(Boolean)
          .map(p => {
               // Strip prefixes like "sha256=" or "v1="
               const eq = p.indexOf("=");
               return eq > -1 ? p.slice(eq + 1).trim() : p;
          });

     for (const candidate of candidates) {
          // Try as hex
          if (/^[a-fA-F0-9]+$/.test(candidate) && candidate.length === 64) {
               if (candidate.toLowerCase() === expectedHex) return true;
          }
          // Try as base64 → hex
          try {
               const decoded = Buffer.from(candidate, "base64").toString("hex").toLowerCase();
               if (decoded === expectedHex) return true;
          } catch {
               // skip
          }
     }

     return false;
}

export function verifyPolarWebhookSignature(params: {
     rawBody: string;
     signatureHeader: string | null;
     secret: string;
     svixId?: string | null;
     svixTimestamp?: string | null;
}): boolean {
     const { rawBody, signatureHeader, secret, svixId, svixTimestamp } = params;
     if (!signatureHeader || !secret.trim()) return false;

     // Try Svix format first (Polar's current method)
     if (svixId && svixTimestamp) {
          if (verifySvixSignature({ rawBody, svixId, svixTimestamp, signatureHeader, secret })) {
               return true;
          }
     }

     // Fallback to legacy HMAC verification
     return verifyLegacySignature({ rawBody, signatureHeader, secret });
}
