"use client";

/**
 * Tenant Public Theme Provider — Milestone 14.4.
 *
 * Wraps tenant-specific public/customer surfaces with a customized MUI theme
 * derived from the tenant's published branding.
 *
 * Only wraps tenant-scoped routes. NOT the global /customer app.
 */

import { useMemo, type ReactNode } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import type { ResolvedTenantTheme } from "../types/branding-config";

type Props = {
  theme: ResolvedTenantTheme;
  children: ReactNode;
};

export default function TenantPublicThemeProvider({ theme, children }: Props) {
  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme.appearance,
          primary: { main: theme.primaryColor },
          secondary: { main: theme.accentColor },
          background: {
            default: theme.backgroundColor,
            paper: theme.surfaceColor,
          },
          text: {
            primary: theme.textColor,
            secondary: theme.mutedTextColor,
          },
          divider: theme.borderColor,
        },
        typography: {
          fontFamily: theme.fontFamily,
        },
        shape: {
          borderRadius: theme.borderRadius,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: { textTransform: "none" as const },
            },
          },
        },
      }),
    [theme]
  );

  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}
