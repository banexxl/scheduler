"use client";

/**
 * Server Action Form with Toast Feedback.
 *
 * Wraps a server action form to show toast notifications on success/completion.
 * Works with Next.js form actions (server actions).
 */

import { useRef, useTransition, type ReactNode } from "react";
import toast from "react-hot-toast";

type Props = {
  action: (formData: FormData) => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  children: ReactNode;
};

export default function ServerActionForm({ action, successMessage = "Done!", errorMessage, children }: Props) {
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(successMessage);
      } catch (err) {
        toast.error(errorMessage ?? (err instanceof Error ? err.message : "Action failed"));
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit}>
      {children}
    </form>
  );
}
