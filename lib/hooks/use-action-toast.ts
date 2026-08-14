import toast from "react-hot-toast";

/**
 * Toast helper for server action results.
 *
 * Usage:
 *   const result = await someAction(values);
 *   showActionToast(result, "Service created!");
 */
export function showActionToast(
  result: { success: boolean; message?: string },
  successMessage?: string
): void {
  if (result.success) {
    toast.success(successMessage ?? result.message ?? "Done!");
  } else {
    toast.error(result.message ?? "Something went wrong.");
  }
}
