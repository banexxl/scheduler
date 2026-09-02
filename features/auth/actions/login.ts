"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/get-safe-redirect-path";
import { loginSchema } from "../schemas/login-schema";
import { resolveLoginDestination } from "../services/resolve-login-destination";
import type { AuthActionResult } from "../types/auth-action-result";

export async function loginAction(
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };
  const next = formData.get("next");

  try {
    const validated = loginSchema.validateSync(raw, { abortEarly: false });

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      return {
        success: false,
        message: "The email or password is incorrect.",
      };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message: "The email or password is incorrect.",
      };
    }

    const destination =
      typeof next === "string" && next
        ? getSafeRedirectPath(next)
        : await resolveLoginDestination(user);
    redirect(destination);
  } catch (error) {
    // Next.js redirect throws a special error — rethrow it
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }

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
