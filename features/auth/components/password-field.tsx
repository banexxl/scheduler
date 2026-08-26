"use client";

/**
 * Password Field with visibility toggle (eye icon).
 */

import { useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

type Props = {
  name: string;
  value: string;
  onChange: React.ChangeEventHandler;
  onBlur: React.FocusEventHandler;
  label: string;
  autoComplete?: string;
  error?: boolean;
  helperText?: string | false;
  disabled?: boolean;
  fullWidth?: boolean;
  margin?: "none" | "dense" | "normal";
};

export default function PasswordField({
  name,
  value,
  onChange,
  onBlur,
  label,
  autoComplete = "current-password",
  error,
  helperText,
  disabled,
  fullWidth = true,
  margin = "normal",
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      label={label}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      error={error}
      helperText={helperText}
      disabled={disabled}
      fullWidth={fullWidth}
      margin={margin}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setVisible(v => !v)}
                edge="end"
                size="small"
                aria-label={visible ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
