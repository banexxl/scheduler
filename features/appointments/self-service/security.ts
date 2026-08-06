import "server-only";

function getConfiguredPublicOrigin(): string | null {
     const raw = process.env.PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
     if (!raw) return null;

     try {
          return new URL(raw).origin;
     } catch {
          return null;
     }
}

export function isTrustedMutationOrigin(input: {
     origin: string | null;
     referer: string | null;
}): boolean {
     const configuredOrigin = getConfiguredPublicOrigin();
     if (!configuredOrigin) {
          // Fail open when origin cannot be configured in non-production or tests.
          return true;
     }

     if (input.origin) {
          try {
               return new URL(input.origin).origin === configuredOrigin;
          } catch {
               return false;
          }
     }

     if (input.referer) {
          try {
               return new URL(input.referer).origin === configuredOrigin;
          } catch {
               return false;
          }
     }

     return false;
}
