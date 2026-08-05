"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePasswordSchema } from "../schemas/update-password-schema";
import { resolveLoginDestination } from "../services/resolve-login-destination";
import type { AuthActionResult } from "../types/auth-action-result";

export async function updatePasswordAction(
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  try {
    const validated = updatePasswordSchema.validateSync(raw, {
      abortEarly: false,
    });

    const supabase = await createClient();

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      redirect("/forgot-password");
    }

    const { error } = await supabase.auth.updateUser({
      password: validated.password,
    });

    if (error) {
      return {
        success: false,
        message: "Unable to update password. Please try again.",
      };
    }

    const destination = await resolveLoginDestination(currentUser);
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
