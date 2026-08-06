import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isTrustedMutationOrigin } from "./security";

describe("self-service trusted origin checks", () => {
     const oldPublic = process.env.PUBLIC_APP_URL;
     const oldNextPublic = process.env.NEXT_PUBLIC_APP_URL;

     beforeEach(() => {
          process.env.PUBLIC_APP_URL = "https://example.com";
          process.env.NEXT_PUBLIC_APP_URL = "https://fallback.example.com";
     });

     afterEach(() => {
          if (oldPublic === undefined) delete process.env.PUBLIC_APP_URL;
          else process.env.PUBLIC_APP_URL = oldPublic;

          if (oldNextPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
          else process.env.NEXT_PUBLIC_APP_URL = oldNextPublic;
     });

     it("accepts exact configured origin", () => {
          expect(
               isTrustedMutationOrigin({ origin: "https://example.com", referer: null })
          ).toBe(true);
     });

     it("accepts matching referer origin when Origin header is missing", () => {
          expect(
               isTrustedMutationOrigin({ origin: null, referer: "https://example.com/manage-appointment/abc" })
          ).toBe(true);
     });

     it("rejects mismatched origin", () => {
          expect(
               isTrustedMutationOrigin({ origin: "https://evil.example", referer: null })
          ).toBe(false);
     });

     it("rejects missing origin and referer when configured", () => {
          expect(
               isTrustedMutationOrigin({ origin: null, referer: null })
          ).toBe(false);
     });

     it("fails open only when app URL is not configured", () => {
          delete process.env.PUBLIC_APP_URL;
          delete process.env.NEXT_PUBLIC_APP_URL;

          expect(
               isTrustedMutationOrigin({ origin: null, referer: null })
          ).toBe(true);
     });
});
