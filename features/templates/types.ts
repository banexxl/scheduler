/**
 * Template System Types — Milestone 16.2.
 *
 * Strongly typed definitions for the code-driven template registry.
 * Templates control layout only — business logic and routing are shared.
 */

import type { ComponentType, ReactNode } from "react";

// ─── Template ID ─────────────────────────────────────────────────────────────

/**
 * Known template identifiers.
 * Each maps to a registered template in the registry.
 */
export const TEMPLATE_IDS = ["minimal", "bold", "elegant"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** Default template for tenants that haven't chosen one. */
export const DEFAULT_TEMPLATE_ID: TemplateId = "minimal";

// ─── Template Shell Props ────────────────────────────────────────────────────

/**
 * Props passed to every template shell component.
 * The shell wraps the booking page content without altering it.
 */
export type TemplateShellProps = {
  children: ReactNode;
};

// ─── Template Registration ───────────────────────────────────────────────────

/**
 * A single template entry in the registry.
 * Code-driven — no database schema needed to add new templates.
 */
export type TemplateDefinition = {
  /** Unique identifier, matches the DB column value. */
  id: TemplateId;
  /** Display name shown in the dashboard. */
  name: string;
  /** Short description for the template card. */
  description: string;
  /** Path to the preview thumbnail image (relative to /public). */
  previewImage: string;
  /** The React component that renders the template shell. */
  component: ComponentType<TemplateShellProps>;
};

// ─── Template Registry Shape ─────────────────────────────────────────────────

export type TemplateRegistry = Record<TemplateId, TemplateDefinition>;

// ─── Serializable Template Info ──────────────────────────────────────────────

/**
 * Serializable subset of TemplateDefinition.
 * Safe to pass from server components to client components (no React component ref).
 */
export type TemplateInfo = {
  id: TemplateId;
  name: string;
  description: string;
  previewImage: string;
};
