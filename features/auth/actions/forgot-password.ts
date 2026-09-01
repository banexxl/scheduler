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
      console.error("[forgot-password] resetPasswordForEmail error:", { status: error.status, message: error.message, code: error.code });
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
    // Even on unexpected error, return neutral message
    return {
      success: true,
      message:
        "If an account exists for that email, a password-reset message has been sent.",
    };
  }
}
