"use server";

import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/helpers/get-app-url";
import { registerSchema } from "../schemas/register-schema";
import type { AuthActionResult } from "../types/auth-action-result";

export async function registerAction(
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  try {
    const validated = registerSchema.validateSync(raw, { abortEarly: false });

    const supabase = await createClient();

    const callbackUrl = new URL("/api/auth/callback", getAppUrl()).toString();

    const { error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      console.error("[register] Supabase signUp error:", { status: error.status, message: error.message, code: error.code });
      if (error.status === 429) {
        return {
          success: false,
          message: "Too many attempts. Please try again later.",
        };
      }
      return {
        success: false,
        message: "Unable to create account. Please try again.",
      };
    }

    return {
      success: true,
      message: "Check your email to confirm your account.",
    };
  } catch (error) {
    console.error("[register] Unexpected error:", error);
    if (error && typeof error === "object" && "inner" in error) {
      const yupError = error as { inner: Array<{ path?: string; message: string }> };
      const fieldErrors: Record<string, string> = {};
      yupError.inner.forEach((err) => {
        if (err.path) fieldErrors[err.path] = err.message;
      });
      return { success: false, fieldErrors };
    }
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
