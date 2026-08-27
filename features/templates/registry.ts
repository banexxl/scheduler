/**
 * Template Registry — Milestone 16.2.
 *
 * Code-driven registry of all available booking portal templates.
 * Adding a new template = creating a shell component + adding an entry here.
 * No database schema changes required.
 */

import type {
  TemplateId,
  TemplateDefinition,
  TemplateRegistry,
  TemplateInfo,
} from "./types";
import { TEMPLATE_IDS, DEFAULT_TEMPLATE_ID } from "./types";
import MinimalShell from "@/app/book/[tenantSlug]/templates/minimal/minimal-shell";
import BoldShell from "@/app/book/[tenantSlug]/templates/bold/bold-shell";
import ElegantShell from "@/app/book/[tenantSlug]/templates/elegant/elegant-shell";

// ─── Registry ────────────────────────────────────────────────────────────────

export const TEMPLATE_REGISTRY: TemplateRegistry = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    description:
      "Clean, distraction-free layout that keeps the focus on your services. Great for most businesses.",
    previewImage: "/templates/minimal-preview.svg",
    component: MinimalShell,
  },
  bold: {
    id: "bold",
    name: "Bold",
    description:
      "Striking, full-width layout with a prominent header band. Perfect for businesses that want to stand out.",
    previewImage: "/templates/bold-preview.svg",
    component: BoldShell,
  },
  elegant: {
    id: "elegant",
    name: "Elegant",
    description:
      "Refined layout with subtle borders and generous whitespace. Ideal for premium or professional services.",
    previewImage: "/templates/elegant-preview.svg",
    component: ElegantShell,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the template definition for a given ID.
 * Falls back to the default template if the ID is unknown.
 */
export function getTemplateDefinition(
  templateId: string | null | undefined
): TemplateDefinition {
  if (templateId && templateId in TEMPLATE_REGISTRY) {
    return TEMPLATE_REGISTRY[templateId as TemplateId];
  }
  return TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID];
}

/**
 * Returns serializable info for all templates (no React component refs).
 * Safe to pass from server components to client components.
 */
export function getAllTemplateInfos(): TemplateInfo[] {
  return TEMPLATE_IDS.map((id) => {
    const def = TEMPLATE_REGISTRY[id];
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      previewImage: def.previewImage,
    };
  });
}

/**
 * Validates that a string is a known template ID.
 */
export function isValidTemplateId(value: string): value is TemplateId {
  return TEMPLATE_IDS.includes(value as TemplateId);
}
