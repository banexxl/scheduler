import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

function sha256(value: string): Buffer {
     return createHash("sha256").update(value, "utf8").digest();
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
     if (!authorizationHeader) return null;

     const trimmed = authorizationHeader.trim();
     if (!trimmed.toLowerCase().startsWith("bearer ")) {
          return null;
     }

     const token = trimmed.slice(7).trim();
     return token.length > 0 ? token : null;
}

export function isAuthorizedBearerSecret(params: {
     authorizationHeader: string | null;
     expectedSecret: string;
}): boolean {
     const provided = extractBearerToken(params.authorizationHeader);
     const expected = params.expectedSecret.trim();

     if (!provided || expected.length === 0) {
          return false;
     }

     const providedHash = sha256(provided);
     const expectedHash = sha256(expected);

     return timingSafeEqual(providedHash, expectedHash);
}
