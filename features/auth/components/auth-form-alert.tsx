"use client";

import Alert from "@mui/material/Alert";

interface AuthFormAlertProps {
  message: string | undefined;
  severity?: "error" | "success" | "info" | "warning";
}

export default function AuthFormAlert({
  message,
  severity = "error",
}: AuthFormAlertProps) {
  if (!message) return null;

  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      {message}
    </Alert>
  );
}
