import "server-only";

/**
 * Campaign Email Renderer — Milestone 15.7.
 *
 * Renders campaign emails with tenant branding.
 * Uses published branding only — never draft.
 * Includes unsubscribe link in all marketing emails.
 */

import { resolvePublishedTenantTheme } from "@/features/branding/services/resolve-tenant-theme";
import type { ResolvedTenantTheme } from "@/features/branding/types/branding-config";

export type CampaignEmailInput = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  subject: string;
  content: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  unsubscribeToken: string;
  customerName: string;
};

export type RenderedCampaignEmail = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Renders a campaign email with tenant branding and unsubscribe link.
 */
export async function renderCampaignEmail(
  input: CampaignEmailInput
): Promise<RenderedCampaignEmail> {
  const theme = await resolvePublishedTenantTheme(input.tenantId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://get-slot.app";
  const unsubscribeUrl = `${baseUrl}/book/${input.tenantSlug}/communications/unsubscribe/${encodeURIComponent(input.unsubscribeToken)}`;

  const html = buildHtml(input, theme, unsubscribeUrl);
  const text = buildPlainText(input, unsubscribeUrl);

  return {
    subject: input.subject,
    html,
    text,
  };
}

function buildHtml(
  input: CampaignEmailInput,
  theme: ResolvedTenantTheme,
  unsubscribeUrl: string
): string {
  const ctaSection = input.ctaText && input.ctaUrl
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:12px 24px;background-color:${theme.primaryColor};color:#ffffff;text-decoration:none;border-radius:${theme.borderRadius}px;font-weight:600;font-size:14px;">${escapeHtml(input.ctaText)}</a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${theme.fontFamily},-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;">
      <h2 style="margin:0;color:${theme.primaryColor};font-size:18px;">${escapeHtml(input.tenantName)}</h2>
    </div>

    <!-- Content -->
    <div style="background-color:#ffffff;border-radius:8px;padding:32px;border:1px solid #e5e7eb;">
      <div style="font-size:15px;line-height:1.6;color:#374151;">
        ${formatContent(input.content)}
      </div>
      ${ctaSection}
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;font-size:12px;color:#9ca3af;">
      <p style="margin:0 0 8px;">You received this email because you opted in to marketing communications from ${escapeHtml(input.tenantName)}.</p>
      <p style="margin:0;"><a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from marketing emails</a></p>
    </div>
  </div>
</body>
</html>`;
}

function buildPlainText(
  input: CampaignEmailInput,
  unsubscribeUrl: string
): string {
  let text = `${input.tenantName}\n\n`;
  text += `${input.content}\n\n`;

  if (input.ctaText && input.ctaUrl) {
    text += `${input.ctaText}: ${input.ctaUrl}\n\n`;
  }

  text += `---\n`;
  text += `You received this email because you opted in to marketing communications from ${input.tenantName}.\n`;
  text += `Unsubscribe: ${unsubscribeUrl}\n`;

  return text;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatContent(content: string): string {
  // Convert newlines to <br> tags, escape HTML in content
  return escapeHtml(content).replace(/\n/g, "<br>");
}
