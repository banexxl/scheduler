import { createHmac, timingSafeEqual } from "node:crypto";

function normalizeToken(value: string): string {
     return value.trim().replace(/^sha256=/i, "").replace(/^v1=/i, "");
}

function decodeBase64ToHex(value: string): string | null {
     try {
          const bytes = Buffer.from(value, "base64");
          if (bytes.length === 0) return null;
          return bytes.toString("hex");
     } catch {
          return null;
     }
}

function isHex(value: string): boolean {
     return /^[a-fA-F0-9]+$/.test(value) && value.length % 2 === 0;
}

function parseSignatureHeader(value: string): string[] {
     return value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
          .flatMap((part) => {
               const eqIndex = part.indexOf("=");
               if (eqIndex > -1) {
                    return [part.slice(eqIndex + 1).trim()];
               }
               return [part];
          })
          .map(normalizeToken)
          .flatMap((token) => {
               if (!token) return [];
               if (isHex(token)) return [token.toLowerCase()];

               const maybeHex = decodeBase64ToHex(token);
               return maybeHex ? [maybeHex.toLowerCase()] : [];
          });
}

function safeEqualHex(a: string, b: string): boolean {
     if (a.length !== b.length) return false;

     const left = Buffer.from(a, "hex");
     const right = Buffer.from(b, "hex");

     if (left.length !== right.length) return false;
     return timingSafeEqual(left, right);
}

export function verifyPolarWebhookSignature(params: {
     rawBody: string;
     signatureHeader: string | null;
     secret: string;
}): boolean {
     const { rawBody, signatureHeader, secret } = params;
     if (!signatureHeader || !secret.trim()) return false;

     const candidates = parseSignatureHeader(signatureHeader);
     if (candidates.length === 0) return false;

     const expectedHex = createHmac("sha256", secret)
          .update(rawBody, "utf8")
          .digest("hex")
          .toLowerCase();

     return candidates.some((candidate) => safeEqualHex(candidate, expectedHex));
}
