"use server";

/**
 * Campaign CRUD Actions — Milestone 15.7.
 *
 * Server actions for campaign create/update/schedule/send/cancel.
 * All audience resolution happens server-side.
 * Browser-provided recipient data is NEVER trusted.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import { logger } from "@/lib/logging";
import { resolveNotificationSettings } from "@/features/notifications/services/notification-settings-service";
import { getEmailProvider } from "@/features/notifications/services/providers";
import { renderCampaignEmail } from "../services/campaign-email-renderer";
import { processSingleCampaign } from "../services/campaign-processor";
import type { CampaignChannel, CampaignAudienceSource } from "../types/campaign";

type ActionResult =
  | { success: true; campaignId?: string }
  | { success: false; message: string };

// ─── Validation ──────────────────────────────────────────────────────────────

const CTA_URL_REGEX = /^https?:\/\//;
const MAX_SUBJECT_LENGTH = 500;
const MAX_CONTENT_LENGTH = 50000;
const MAX_CTA_TEXT_LENGTH = 100;
const MAX_CTA_URL_LENGTH = 2000;

function validateCtaUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  if (url.length > MAX_CTA_URL_LENGTH) return false;
  return CTA_URL_REGEX.test(url);
}

// ─── Create Campaign ─────────────────────────────────────────────────────────

export async function createCampaignAction(
  tenantSlug: string,
  input: {
    name: string;
    channel: CampaignChannel;
    subject?: string;
    content?: string;
    ctaText?: string;
    ctaUrl?: string;
    segmentId?: string | null;
    audienceSource: CampaignAudienceSource;
  }
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "campaign.create",
    tenantId: tenant.id,
    userId: user.id,
  });

  // Validate
  if (!input.name?.trim()) return { success: false, message: "Campaign name is required." };
  if (input.subject && input.subject.length > MAX_SUBJECT_LENGTH) {
    return { success: false, message: "Subject is too long." };
  }
  if (input.content && input.content.length > MAX_CONTENT_LENGTH) {
    return { success: false, message: "Content is too long." };
  }
  if (input.ctaText && input.ctaText.length > MAX_CTA_TEXT_LENGTH) {
    return { success: false, message: "CTA text is too long." };
  }
  if (!validateCtaUrl(input.ctaUrl)) {
    return { success: false, message: "CTA URL must start with http:// or https://." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_campaigns" as never)
    .insert({
      tenant_id: tenant.id,
      name: input.name.trim(),
      channel: input.channel,
      subject: input.subject?.trim() || null,
      content: input.content || null,
      cta_text: input.ctaText?.trim() || null,
      cta_url: input.ctaUrl?.trim() || null,
      segment_id: input.audienceSource === "segment" ? (input.segmentId || null) : null,
      audience_source: input.audienceSource,
      status: "draft",
      created_by: user.id,
    } as never)
    .select("id" as never)
    .single();

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to create campaign." };
  }

  const campaignId = (data as unknown as { id: string })?.id;
  await log.success({ campaignId });
  revalidatePath(`/${tenantSlug}/campaigns`);
  return { success: true, campaignId };
}

// ─── Update Campaign ─────────────────────────────────────────────────────────

export async function updateCampaignAction(
  tenantSlug: string,
  campaignId: string,
  input: {
    name?: string;
    subject?: string;
    content?: string;
    ctaText?: string | null;
    ctaUrl?: string | null;
    segmentId?: string | null;
    audienceSource?: CampaignAudienceSource;
  }
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  if (input.ctaUrl !== null && input.ctaUrl !== undefined && !validateCtaUrl(input.ctaUrl)) {
    return { success: false, message: "CTA URL must start with http:// or https://." };
  }

  const supabase = await createClient();

  // Verify campaign is still editable (draft only)
  const { data: existing } = await supabase
    .from("customer_campaigns" as never)
    .select("status" as never)
    .eq("id" as never, campaignId)
    .eq("tenant_id" as never, tenant.id)
    .single();

  if (!existing) return { success: false, message: "Campaign not found." };
  if ((existing as unknown as { status: string }).status !== "draft") {
    return { success: false, message: "Only draft campaigns can be edited." };
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.subject !== undefined) updateData.subject = input.subject?.trim() || null;
  if (input.content !== undefined) updateData.content = input.content || null;
  if (input.ctaText !== undefined) updateData.cta_text = input.ctaText?.trim() || null;
  if (input.ctaUrl !== undefined) updateData.cta_url = input.ctaUrl?.trim() || null;
  if (input.segmentId !== undefined) updateData.segment_id = input.segmentId || null;
  if (input.audienceSource !== undefined) updateData.audience_source = input.audienceSource;

  const { error } = await supabase
    .from("customer_campaigns" as never)
    .update(updateData as never)
    .eq("id" as never, campaignId)
    .eq("tenant_id" as never, tenant.id);

  if (error) return { success: false, message: "Unable to update campaign." };

  revalidatePath(`/${tenantSlug}/campaigns`);
  revalidatePath(`/${tenantSlug}/campaigns/${campaignId}`);
  return { success: true, campaignId };
}

// ─── Send Test ───────────────────────────────────────────────────────────────

export async function sendTestCampaignAction(
  tenantSlug: string,
  campaignId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "campaign.test_send",
    tenantId: tenant.id,
    userId: user.id,
  });

  const supabase = createServiceRoleClient();

  // Load campaign
  const { data: campaign } = await supabase
    .from("customer_campaigns" as never)
    .select("id, subject, content, cta_text, cta_url, name, tenant_id" as never)
    .eq("id" as never, campaignId)
    .eq("tenant_id" as never, tenant.id)
    .single();

  if (!campaign) return { success: false, message: "Campaign not found." };

  const c = campaign as unknown as {
    id: string; subject: string | null; content: string | null;
    cta_text: string | null; cta_url: string | null; name: string; tenant_id: string;
  };

  // Get user email for test delivery
  const { data: userData } = await supabase.auth.admin.getUserById(user.id);
  const testEmail = userData?.user?.email;
  if (!testEmail) return { success: false, message: "No email found for your account." };

  // Render email (uses a dummy unsubscribe token — test sends don't create real tokens)
  const rendered = await renderCampaignEmail({
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantSlug,
    subject: c.subject ?? c.name,
    content: c.content ?? "",
    ctaText: c.cta_text,
    ctaUrl: c.cta_url,
    unsubscribeToken: "test-token-not-real",
    customerName: "Test Recipient",
  });

  // Send via provider
  const settings = await resolveNotificationSettings(tenant.id, tenant.name);
  const provider = getEmailProvider();
  const result = await provider.send({
    to: testEmail,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    fromName: settings.senderName ?? tenant.name,
    replyTo: settings.replyToEmail ?? undefined,
    idempotencyKey: `campaign-test:${campaignId}:${Date.now()}`,
  });

  if (!result.success) {
    await log.failure({ errorCode: result.errorCode });
    return { success: false, message: `Test send failed: ${result.safeMessage}` };
  }

  // Does NOT create campaign recipient rows
  // Does NOT increment campaign metrics
  await log.success({ campaignId, testEmail: "[redacted]" });
  return { success: true };
}

// ─── Send Now ────────────────────────────────────────────────────────────────

export async function sendCampaignNowAction(
  tenantSlug: string,
  campaignId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "campaign.send",
    tenantId: tenant.id,
    userId: user.id,
  });

  const supabase = createServiceRoleClient();

  // Atomic transition: draft → processing
  const { data: started } = await supabase.rpc("start_campaign_now" as never, {
    p_campaign_id: campaignId,
    p_tenant_id: tenant.id,
  } as never);

  if (!started) {
    return { success: false, message: "Campaign could not be started. It may have already been sent." };
  }

  // Load campaign for processing
  const { data: campaign } = await supabase
    .from("customer_campaigns" as never)
    .select("id, tenant_id, segment_id, audience_source, channel, subject, content, cta_text, cta_url, name" as never)
    .eq("id" as never, campaignId)
    .single();

  if (!campaign) {
    return { success: false, message: "Campaign not found." };
  }

  const c = campaign as unknown as {
    id: string; tenant_id: string; segment_id: string | null;
    audience_source: string; channel: string; subject: string | null;
    content: string | null; cta_text: string | null; cta_url: string | null; name: string;
  };

  // Process — fire-and-forget (bounded by DELIVERY_BATCH_SIZE internally)
  // In production with large audiences, this would be deferred to background worker.
  processSingleCampaign(c).catch((err) => {
    logger.error("campaign_send_now_failed", { campaignId }, err);
  });

  await log.success({ campaignId });
  revalidatePath(`/${tenantSlug}/campaigns`);
  revalidatePath(`/${tenantSlug}/campaigns/${campaignId}`);
  return { success: true, campaignId };
}

// ─── Schedule Campaign ───────────────────────────────────────────────────────

export async function scheduleCampaignAction(
  tenantSlug: string,
  campaignId: string,
  scheduledFor: string // ISO datetime in UTC
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "campaign.schedule",
    tenantId: tenant.id,
    userId: user.id,
  });

  // Validate schedule time is in the future
  const scheduleDate = new Date(scheduledFor);
  if (isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
    return { success: false, message: "Scheduled time must be in the future." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("customer_campaigns" as never)
    .update({
      status: "scheduled",
      scheduled_for: scheduleDate.toISOString(),
    } as never)
    .eq("id" as never, campaignId)
    .eq("tenant_id" as never, tenant.id)
    .eq("status" as never, "draft"); // Only draft → scheduled

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to schedule campaign." };
  }

  await log.success({ campaignId, scheduledFor: scheduleDate.toISOString() });
  revalidatePath(`/${tenantSlug}/campaigns`);
  revalidatePath(`/${tenantSlug}/campaigns/${campaignId}`);
  return { success: true, campaignId };
}

// ─── Cancel Campaign ─────────────────────────────────────────────────────────

export async function cancelCampaignAction(
  tenantSlug: string,
  campaignId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "campaign.cancel",
    tenantId: tenant.id,
    userId: user.id,
  });

  const supabase = await createClient();

  // Can only cancel draft or scheduled
  const { error } = await supabase
    .from("customer_campaigns" as never)
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    } as never)
    .eq("id" as never, campaignId)
    .eq("tenant_id" as never, tenant.id)
    .in("status" as never, ["draft", "scheduled"]);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to cancel campaign." };
  }

  await log.success({ campaignId });
  revalidatePath(`/${tenantSlug}/campaigns`);
  return { success: true };
}

// ─── Delete Campaign ─────────────────────────────────────────────────────────

export async function deleteCampaignAction(
  tenantSlug: string,
  campaignId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const supabase = await createClient();

  // Can only delete draft campaigns
  const { error } = await supabase
    .from("customer_campaigns" as never)
    .delete()
    .eq("id" as never, campaignId)
    .eq("tenant_id" as never, tenant.id)
    .eq("status" as never, "draft");

  if (error) return { success: false, message: "Unable to delete campaign." };

  revalidatePath(`/${tenantSlug}/campaigns`);
  return { success: true };
}
