"use client";

/**
 * Tenant Theme Provider — Milestone 16.1.
 *
 * Client component that wraps the public booking portal with:
 * - MUI ThemeProvider (dynamic theme from tenant branding)
 * - CssBaseline (consistent cross-browser baseline)
 * - TenantThemeContext (exposes branding, muiTheme, tenant, template)
 *
 * Used inside app/book/[tenantSlug]/layout.tsx.
 * All nested components inherit the tenant's styling automatically.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createTenantTheme } from "@/lib/branding/create-theme";
import type {
  TenantBranding,
  TenantThemeContextValue,
} from "@/types/branding";

// ─── Context ─────────────────────────────────────────────────────────────────

const TenantThemeContext = createContext<TenantThemeContextValue | null>(null);

/**
 * Hook to access tenant branding, MUI theme, tenant metadata, and template
 * from anywhere inside the public booking portal.
 *
 * Throws if used outside TenantThemeProvider.
 */
export function useTenantTheme(): TenantThemeContextValue {
  const ctx = useContext(TenantThemeContext);
  if (!ctx) {
    throw new Error(
      "useTenantTheme must be used within <TenantThemeProvider>. " +
      "Ensure this component is rendered inside app/book/[tenantSlug]/layout.tsx."
    );
  }
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

type Props = {
  branding: TenantBranding;
  children: ReactNode;
};

export default function TenantThemeProvider({ branding, children }: Props) {
  const { theme: resolvedTheme, tenant } = branding;

  // Memoize the MUI theme so it's only recreated when branding changes.
  const muiTheme = useMemo(
    () => createTenantTheme(resolvedTheme),
    [resolvedTheme]
  );

  // Context value memoized for stable reference.
  const contextValue = useMemo<TenantThemeContextValue>(
    () => ({
      branding: resolvedTheme,
      muiTheme,
      tenant,
      template: branding.templateId,
      portal: branding.portal,
    }),
    [resolvedTheme, muiTheme, tenant, branding.templateId, branding.portal]
  );

  return (
    <TenantThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </TenantThemeContext.Provider>
  );
}
