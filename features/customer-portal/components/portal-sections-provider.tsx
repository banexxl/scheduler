"use client";

/**
 * Portal Sections Provider.
 *
 * Exposes which content sections are actually set up for the tenant so the
 * portal header/navigation can hide links to sections that don't exist yet
 * (e.g. hide "Staff" when no staff is configured).
 *
 * Resolved server-side in app/book/[tenantSlug]/layout.tsx and mirrors the
 * conditional section rendering on the public booking page.
 */

import { createContext, useContext, type ReactNode } from "react";

export type PortalSectionAvailability = {
     services: boolean;
     staff: boolean;
     locations: boolean;
     reviews: boolean;
     contact: boolean;
};

const PortalSectionsContext = createContext<PortalSectionAvailability | null>(null);

/**
 * Access the availability of portal content sections.
 *
 * Throws if used outside <PortalSectionsProvider>.
 */
export function usePortalSections(): PortalSectionAvailability {
     const ctx = useContext(PortalSectionsContext);
     if (!ctx) {
          throw new Error(
               "usePortalSections must be used within <PortalSectionsProvider>. " +
               "Ensure this component is rendered inside app/book/[tenantSlug]/layout.tsx."
          );
     }
     return ctx;
}

type Props = {
     sections: PortalSectionAvailability;
     children: ReactNode;
};

export default function PortalSectionsProvider({ sections, children }: Props) {
     return (
          <PortalSectionsContext.Provider value={sections}>
               {children}
          </PortalSectionsContext.Provider>
     );
}
