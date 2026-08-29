"use client";

/**
 * Portal Auth Provider — exposes current user auth state to portal components.
 *
 * The layout (server component) checks Supabase session and passes
 * the user email down. Client components read it from context.
 */

import { createContext, useContext, type ReactNode } from "react";

type PortalAuthState = {
  userEmail: string | null;
  isLoggedIn: boolean;
};

const PortalAuthContext = createContext<PortalAuthState>({
  userEmail: null,
  isLoggedIn: false,
});

export function usePortalAuth(): PortalAuthState {
  return useContext(PortalAuthContext);
}

export default function PortalAuthProvider({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: ReactNode;
}) {
  return (
    <PortalAuthContext.Provider value={{ userEmail, isLoggedIn: Boolean(userEmail) }}>
      {children}
    </PortalAuthContext.Provider>
  );
}
