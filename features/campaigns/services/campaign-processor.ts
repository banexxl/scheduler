import "server-only";

/**
 * Campaign Processor — Milestone 15.7.
 *
 * Processes campaign delivery in bounded batches.
 * Called by the internal cron route.
 *
 * Architecture:
 * 1. Claim due scheduled campaigns (atomic, prevents double-claim)
 * 2. For each campaign: resolve audience → snapshot recipients → deliver in batches
 * 3. Final suppression check before each provider dispatch (late opt-out safety)
 * 4. Update campaign metrics on completion
 *
 * Reuses: getEmailProvider() from existing notification infrastructure.
 * Batch size: 10 recipients per provider round.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { getEmailProvider } from "@/features/notifications/services/providers";
import { resolveNotificationSettings } from "@/features/notifications/services/notification-settings-service";
import { resolveAudienceForExecution } from "./audience-resolver";
import { isCustomerMarketingEligible } from "./marketing-eligibility";
import { getOrCreateUnsubscribeToken } from "./unsubscribe-token-service";
import { renderCampaignEmail } from "./campaign-email-renderer";
import type { CampaignAudienceSource, RecipientSkipReason } from "../types/campaign";
import { logger } from "@/lib/logging";

const DELIVERY_BATCH_SIZE = 10;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProcessCampaignsResult = {
  campaignsProcessed: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
};

// ─── Process Scheduled Campaigns ─────────────────────────────────────────────

/**
 * Finds and processes all due scheduled campaigns.
 * Called by POST /api/internal/campaigns/process
 */
export async function processScheduledCampaigns(): Promise<ProcessCampaignsResult> {
  const supabase = createServiceRoleClient();

  // Find due campaigns
  const { data: dueCampaigns } = await supabase
    .from("customer_campaigns" as never)
    .select("id, tenant_id, segment_id, audience_source, channel, subject, content, cta_text, cta_url, name" as never)
    .eq("status" as never, "scheduled")
    .lte("scheduled_for" as never, new Date().toISOString())
    .limit(5);

  const campaigns = ((dueCampaigns ?? []) as unknown as Array<{
    id: string; tenant_id: string; segment_id: string | null;
    audience_source: string; channel: string; subject: string | null;
    content: string | null; cta_text: string | null; cta_url: string | null; name: string;
  }>);

  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const campaign of campaigns) {
    // Atomic claim (prevents double-processing)
    const { data: claimed } = await supabase.rpc("claim_scheduled_campaign" as never, {
      p_campaign_id: campaign.id,
    } as never);

    if (!claimed) continue;

    const result = await processSingleCampaign(campaign);
    totalSent += result.sent;
    totalFailed += result.failed;
    totalSkipped += result.skipped;
  }

  return {
    campaignsProcessed: campaigns.length,
    totalSent,
    totalFailed,
    totalSkipped,
  };
}

/**
 * Processes a single campaign that is already in "processing" state.
 * Used by both scheduled processor and send-now flow.
 */
export async function processSingleCampaign(campaign: {
  id: string;
  tenant_id: string;
  segment_id: string | null;
  audience_source: string;
  channel: string;
  subject: string | null;
  content: string | null;
  cta_text: string | null;
  cta_url: string | null;
  name: string;
}): Promise<{ sent: number; failed: number; skipped: number }> {
  const supabase = createServiceRoleClient();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // 1. Resolve audience (re-evaluate segment with current data)
    const audience = await resolveAudienceForExecution(
      campaign.tenant_id,
      campaign.segment_id,
      campaign.audience_source as CampaignAudienceSource,
      "email"
    );

    // 2. Update campaign with audience snapshot
    await supabase
      .from("customer_campaigns" as never)
      .update({
        audience_name_snapshot: audience.audienceNameSnapshot,
        audience_rules_snapshot: audience.audienceRulesSnapshot,
        matched_count: audience.matchedCount,
        eligible_count: audience.eligibleCount,
      } as never)
      .eq("id" as never, campaign.id);

    // 3. Create recipient snapshot rows (idempotent via unique constraint)
    for (const eligibilityResult of audience.eligibility) {
      await supabase
        .from("customer_campaign_recipients" as never)
        .upsert({
          tenant_id: campaign.tenant_id,
          campaign_id: campaign.id,
          customer_id: eligibilityResult.customerId,
          channel: "email",
          recipient_email: eligibilityResult.email,
          status: eligibilityResult.eligible ? "eligible" : "skipped",
          skip_reason: eligibilityResult.skipReason,
        } as never, {
          onConflict: "campaign_id,customer_id,channel",
          ignoreDuplicates: true,
        } as never);

      if (!eligibilityResult.eligible) {
        skipped++;
      }
    }

    // 4. Get tenant info for email rendering
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, slug")
      .eq("id", campaign.tenant_id)
      .single();

    const tenantName = (tenant as { name: string; slug: string } | null)?.name ?? "Business";
    const tenantSlug = (tenant as { name: string; slug: string } | null)?.slug ?? "";

    // 5. Resolve notification settings for sender identity
    const settings = await resolveNotificationSettings(campaign.tenant_id, tenantName);
    const senderName = settings.senderName ?? tenantName;

    // 6. Deliver to eligible recipients in batches
    const eligibleRecipients = audience.eligibility.filter((e) => e.eligible);

    for (let i = 0; i < eligibleRecipients.length; i += DELIVERY_BATCH_SIZE) {
      const batch = eligibleRecipients.slice(i, i + DELIVERY_BATCH_SIZE);

      for (const recipient of batch) {
        const deliveryResult = await deliverToRecipient({
          campaignId: campaign.id,
          tenantId: campaign.tenant_id,
          tenantName,
          tenantSlug,
          senderName,
          replyTo: settings.replyToEmail ?? undefined,
          customerId: recipient.customerId,
          email: recipient.email!,
          subject: campaign.subject ?? campaign.name,
          content: campaign.content ?? "",
          ctaText: campaign.cta_text,
          ctaUrl: campaign.cta_url,
        });

        if (deliveryResult === "sent") sent++;
        else if (deliveryResult === "failed") failed++;
        else skipped++;
      }
    }

    // 7. Complete campaign
    await supabase.rpc("complete_campaign" as never, {
      p_campaign_id: campaign.id,
      p_sent_count: sent,
      p_failed_count: failed,
      p_skipped_count: skipped,
    } as never);

  } catch (error) {
    logger.error("campaign_processing_failed", {
      campaignId: campaign.id,
      tenantId: campaign.tenant_id,
    }, error);

    // Mark campaign as failed (preserving partial progress)
    await supabase.rpc("fail_campaign" as never, {
      p_campaign_id: campaign.id,
      p_sent_count: sent,
      p_failed_count: failed,
      p_skipped_count: skipped,
    } as never);
  }

  return { sent, failed, skipped };
}

// ─── Deliver to Single Recipient ─────────────────────────────────────────────

async function deliverToRecipient(input: {
  campaignId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  senderName: string;
  replyTo?: string;
  customerId: string;
  email: string;
  subject: string;
  content: string;
  ctaText: string | null;
  ctaUrl: string | null;
}): Promise<"sent" | "failed" | "skipped"> {
  const supabase = createServiceRoleClient();

  // LATE SUPPRESSION CHECK — critical safety net (PART 8)
  const { eligible, skipReason } = await isCustomerMarketingEligible(
    input.tenantId,
    input.customerId,
    "email"
  );

  if (!eligible) {
    // Customer opted out between snapshot and delivery
    await updateRecipientStatus(
      input.campaignId,
      input.customerId,
      "skipped",
      (skipReason as RecipientSkipReason) ?? "late_unsubscribe"
    );
    return "skipped";
  }

  try {
    // Generate unsubscribe token
    const unsubscribeToken = await getOrCreateUnsubscribeToken(
      input.tenantId,
      input.customerId
    );

    // Render email
    const rendered = await renderCampaignEmail({
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      tenantSlug: input.tenantSlug,
      subject: input.subject,
      content: input.content,
      ctaText: input.ctaText,
      ctaUrl: input.ctaUrl,
      unsubscribeToken,
      customerName: "",
    });

    // Send via provider
    const provider = getEmailProvider();
    const result = await provider.send({
      to: input.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      fromName: input.senderName,
      replyTo: input.replyTo,
      idempotencyKey: `campaign:${input.campaignId}:${input.customerId}`,
    });

    if (result.success) {
      await supabase
        .from("customer_campaign_recipients" as never)
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: result.providerMessageId ?? null,
        } as never)
        .eq("campaign_id" as never, input.campaignId)
        .eq("customer_id" as never, input.customerId);
      return "sent";
    }

    // Provider failure
    await updateRecipientStatus(
      input.campaignId,
      input.customerId,
      "failed",
      "provider_error",
      result.errorCode
    );
    return "failed";

  } catch (error) {
    logger.error("campaign_recipient_delivery_failed", {
      campaignId: input.campaignId,
      customerId: input.customerId,
    }, error);

    await updateRecipientStatus(
      input.campaignId,
      input.customerId,
      "failed",
      "provider_error"
    );
    return "failed";
  }
}

async function updateRecipientStatus(
  campaignId: string,
  customerId: string,
  status: string,
  skipReason?: string,
  errorCode?: string
) {
  const supabase = createServiceRoleClient();
  const update: Record<string, unknown> = { status };
  if (skipReason) update.skip_reason = skipReason;
  if (errorCode) update.error_code = errorCode;
  if (status === "failed") update.failed_at = new Date().toISOString();

  await supabase
    .from("customer_campaign_recipients" as never)
    .update(update as never)
    .eq("campaign_id" as never, campaignId)
    .eq("customer_id" as never, customerId);
}
