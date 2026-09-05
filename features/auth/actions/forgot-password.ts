"use server";

import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/helpers/get-app-url";
import { forgotPasswordSchema } from "../schemas/forgot-password-schema";
import type { AuthActionResult } from "../types/auth-action-result";

export async function forgotPasswordAction(
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    email: formData.get("email"),
  };

  try {
    const validated = forgotPasswordSchema.validateSync(raw, {
      abortEarly: false,
    });

    const supabase = await createClient();

    const redirectUrl = new URL(
      "/api/auth/callback?next=/update-password",
      getAppUrl()
    ).toString();

    console.log("[forgot-password] Sending reset email", { email: validated.email, redirectTo: redirectUrl });

    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
      redirectTo: redirectUrl,
    });

    // Log the real outcome server-side, but keep the response neutral to avoid
    // revealing whether the email exists.
    if (error) {
      // For `fetch failed` / status 0 errors, the useful detail lives on the
      // error's `cause` chain (Node/undici network + SMTP failures), not on
      // the top-level message. Surface as much as possible for diagnostics.
      const cause = (error as unknown as { cause?: unknown }).cause;
      console.error("[forgot-password] resetPasswordForEmail error:", {
        name: error.name,
        status: error.status,
        message: error.message,
        code: error.code,
        cause,
        causeMessage:
          cause && typeof cause === "object" && "message" in cause
            ? (cause as { message?: unknown }).message
            : undefined,
        causeCode:
          cause && typeof cause === "object" && "code" in cause
            ? (cause as { code?: unknown }).code
            : undefined,
        stack: error.stack,
      });
    } else {
      console.log("[forgot-password] Reset email request accepted", { email: validated.email });
    }

    // Always return success to avoid revealing email existence
    return {
      success: true,
      message:
        "If an account exists for that email, a password-reset message has been sent.",
    };
  } catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const yupError = error as { inner: Array<{ path?: string; message: string }> };
      const fieldErrors: Record<string, string> = {};
      yupError.inner.forEach((err) => {
        if (err.path) fieldErrors[err.path] = err.message;
      });
      return { success: false, fieldErrors };
    }

    // Not a validation error — log the unexpected failure (including cause
    // chain) before returning the neutral message.
    const cause = (error as { cause?: unknown } | null)?.cause;
    console.error("[forgot-password] unexpected error:", {
      error,
      message:
        error && typeof error === "object" && "message" in error
          ? (error as { message?: unknown }).message
          : String(error),
      cause,
    });

    // Even on unexpected error, return neutral message
    return {
      success: true,
      message:
        "If an account exists for that email, a password-reset message has been sent.",
    };
  }
}
