import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import {
     decryptAppointmentAccessToken,
     encryptAppointmentAccessToken,
     generateAppointmentAccessToken,
     getAppointmentTokenPrefix,
     hashAppointmentAccessToken,
     hashClientIp,
     hashRequestPayload,
} from "@/lib/security/appointment-token-crypto";
import {
     canCustomerCancelAppointment,
     canCustomerRescheduleAppointment,
} from "@/features/booking-rules/utils/cancellation-rescheduling";
import { getResolvedBookingRules } from "@/features/booking-rules/services/get-booking-rules";
import { getAppointmentById } from "@/features/appointments/services/appointment-queries";
import type {
     AppointmentAccessTokenRow,
     CustomerActionLogItem,
     ManagedTokenResolution,
     PublicManagedAppointment,
     ResolveAppointmentAccessResult,
     TokenMetadataSummary,
} from "../types";

const MANAGE_APPOINTMENT_UNAVAILABLE_MESSAGE =
     "This appointment link is invalid or no longer available.";

const ACTIVE_ACTION_STATUSES = new Set(["pending", "confirmed"]);

type TokenCreateResult = {
     rawToken: string;
     tokenId: string;
     expiresAt: string;
};

type ResolveOptions = {
     recordUsage?: boolean;
     ipAddress?: string | null;
     userAgent?: string | null;
};

type TokenRowWithRelations = AppointmentAccessTokenRow & {
     appointments: {
          id: string;
          tenant_id: string;
          appointment_number: string;
          status: string;
          starts_at: string;
          ends_at: string;
          duration_minutes: number;
          price: number;
          currency: string;
          service_id: string;
          location_id: string;
          resource_id: string;
          service_name_snapshot: string;
          location_name_snapshot: string;
          resource_name_snapshot: string;
     } | null;
     tenants: {
          id: string;
          name: string;
          logo_path: string | null;
          default_timezone: string;
     } | null;
};

function getTrustedPublicAppUrl(): string {
     const fromPublic = process.env.PUBLIC_APP_URL?.trim();
     const fromNextPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
     const value = fromPublic || fromNextPublic;

     if (!value) {
          throw new Error("PUBLIC_APP_URL (or NEXT_PUBLIC_APP_URL fallback) is not configured");
     }

     const parsed = new URL(value);
     if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          throw new Error("PUBLIC_APP_URL must use http or https");
     }

     return parsed.toString().replace(/\/$/, "");
}

export function getManageAppointmentUrl(rawToken: string): string {
     return `${getTrustedPublicAppUrl()}/manage-appointment/${rawToken}`;
}

export function getTokenUnavailableMessage(): string {
     return MANAGE_APPOINTMENT_UNAVAILABLE_MESSAGE;
}

function calculateTokenExpiry(appointmentStartsAtIso: string, createdAt = new Date()): string {
     const appointmentStart = new Date(appointmentStartsAtIso);
     const thirtyDaysAfterStart = new Date(appointmentStart.getTime() + 30 * 24 * 60 * 60_000);
     const maxByCreation = new Date(createdAt.getTime() + 365 * 24 * 60 * 60_000);

     const expiresAt = thirtyDaysAfterStart.getTime() <= maxByCreation.getTime()
          ? thirtyDaysAfterStart
          : maxByCreation;

     return expiresAt.toISOString();
}

function summarizeUserAgent(userAgent: string | null | undefined): string | null {
     if (!userAgent) return null;
     const trimmed = userAgent.replace(/\s+/g, " ").trim();
     if (!trimmed) return null;
     return trimmed.slice(0, 200);
}

function resolveActionDeadlines(
     startsAt: string,
     cancellationNoticeMinutes: number,
     rescheduleNoticeMinutes: number
): { cancellationDeadline: string | null; rescheduleDeadline: string | null } {
     const startsMs = new Date(startsAt).getTime();
     const cancellationDeadline = new Date(startsMs - cancellationNoticeMinutes * 60_000).toISOString();
     const rescheduleDeadline = new Date(startsMs - rescheduleNoticeMinutes * 60_000).toISOString();

     return {
          cancellationDeadline,
          rescheduleDeadline,
     };
}

function toPublicManagedAppointment(
     row: TokenRowWithRelations,
     canCancel: boolean,
     canReschedule: boolean,
     cancellationDeadline: string | null,
     rescheduleDeadline: string | null
): PublicManagedAppointment {
     const appointment = row.appointments;
     const tenant = row.tenants;

     if (!appointment || !tenant) {
          throw new Error("Invalid appointment token relation shape");
     }

     const startsAt = appointment.starts_at;
     const endsAt = appointment.ends_at;
     const timeZone = tenant.default_timezone;

     return {
          appointmentNumber: appointment.appointment_number,
          status: appointment.status as PublicManagedAppointment["status"],
          serviceName: appointment.service_name_snapshot,
          resourceName: appointment.resource_name_snapshot || null,
          locationName: appointment.location_name_snapshot,
          startsAt,
          endsAt,
          localDate: formatInTimeZone(startsAt, timeZone, "yyyy-MM-dd"),
          localStartTime: formatInTimeZone(startsAt, timeZone, "HH:mm"),
          localEndTime: formatInTimeZone(endsAt, timeZone, "HH:mm"),
          timeZone,
          durationMinutes: appointment.duration_minutes,
          price: Number(appointment.price).toFixed(2),
          currency: appointment.currency,
          tenantName: tenant.name,
          tenantLogoUrl: tenant.logo_path,
          canCancel,
          canReschedule,
          cancellationDeadline,
          rescheduleDeadline,
     };
}

async function loadTokenByHash(tokenHash: string): Promise<TokenRowWithRelations | null> {
     const supabase = createAdminClient() as any;

     const { data, error } = await supabase
          .from("appointment_access_tokens")
          .select(
               `
      id,
      tenant_id,
      appointment_id,
      token_hash,
      token_prefix,
      purpose,
      expires_at,
      last_used_at,
      use_count,
      revoked_at,
      revocation_reason,
      token_ciphertext,
      token_iv,
      token_auth_tag,
      encryption_key_version,
      created_at,
      updated_at,
      appointments:appointments (
        id,
        tenant_id,
        appointment_number,
        status,
        starts_at,
        ends_at,
        duration_minutes,
        price,
        currency,
        service_id,
        location_id,
        resource_id,
        service_name_snapshot,
        location_name_snapshot,
        resource_name_snapshot
      ),
      tenants:tenants (
        id,
        name,
        logo_path,
        default_timezone
      )
    `
          )
          .eq("token_hash", tokenHash)
          .maybeSingle();

     if (error || !data) return null;
     return data as TokenRowWithRelations;
}

async function appendCustomerActionLog(input: {
     tenantId: string;
     appointmentId: string;
     accessTokenId?: string | null;
     actionType: string;
     status: "success" | "failed";
     previousStartsAt?: string | null;
     newStartsAt?: string | null;
     previousResourceId?: string | null;
     newResourceId?: string | null;
     reason?: string | null;
     failureCode?: string | null;
     ipAddress?: string | null;
     userAgent?: string | null;
}): Promise<void> {
     const supabase = createAdminClient() as any;

     const ipHash = input.ipAddress ? hashClientIp(input.ipAddress) : null;
     const userAgentSummary = summarizeUserAgent(input.userAgent);

     await supabase
          .from("appointment_customer_actions")
          .insert({
               tenant_id: input.tenantId,
               appointment_id: input.appointmentId,
               access_token_id: input.accessTokenId ?? null,
               action_type: input.actionType,
               status: input.status,
               previous_starts_at: input.previousStartsAt ?? null,
               new_starts_at: input.newStartsAt ?? null,
               previous_resource_id: input.previousResourceId ?? null,
               new_resource_id: input.newResourceId ?? null,
               reason: input.reason ? input.reason.slice(0, 500) : null,
               failure_code: input.failureCode ? input.failureCode.slice(0, 120) : null,
               ip_hash: ipHash,
               user_agent_summary: userAgentSummary,
          });
}

export async function createAppointmentAccessToken(input: {
     tenantId: string;
     appointmentId: string;
     expiresAt?: string;
     revocationReason?: string;
}): Promise<TokenCreateResult> {
     const appointment = await getAppointmentById(input.tenantId, input.appointmentId);
     if (!appointment) {
          throw new Error("Appointment not found for token creation");
     }

     const rawToken = generateAppointmentAccessToken();
     const tokenHash = hashAppointmentAccessToken(rawToken);
     const tokenPrefix = getAppointmentTokenPrefix(rawToken);

     const expiresAt = input.expiresAt ?? calculateTokenExpiry(appointment.startsAt);
     const encrypted = encryptAppointmentAccessToken(rawToken, 1);

     const supabase = createAdminClient() as any;

     const { data, error } = await supabase.rpc("rotate_appointment_access_token", {
          p_tenant_id: input.tenantId,
          p_appointment_id: input.appointmentId,
          p_token_hash: tokenHash,
          p_token_prefix: tokenPrefix,
          p_expires_at: expiresAt,
          p_token_ciphertext: encrypted.ciphertext,
          p_token_iv: encrypted.iv,
          p_token_auth_tag: encrypted.authTag,
          p_encryption_key_version: encrypted.keyVersion,
          p_revocation_reason: input.revocationReason ?? "rotated",
     });

     if (error || !Array.isArray(data) || data.length === 0) {
          throw new Error("Failed to rotate appointment access token");
     }

     return {
          rawToken,
          tokenId: String(data[0].id),
          expiresAt: String(data[0].expires_at),
     };
}

export async function revokeAppointmentAccessToken(input: {
     tenantId: string;
     appointmentId: string;
     tokenId: string;
     reason?: string | null;
}): Promise<void> {
     const supabase = createAdminClient() as any;

     await supabase
          .from("appointment_access_tokens")
          .update({
               revoked_at: new Date().toISOString(),
               revocation_reason: (input.reason ?? "revoked").slice(0, 500),
               updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", input.tenantId)
          .eq("appointment_id", input.appointmentId)
          .eq("id", input.tokenId)
          .is("revoked_at", null);
}

export async function getActiveTokenMetadataForAppointment(
     tenantId: string,
     appointmentId: string
): Promise<TokenMetadataSummary | null> {
     const supabase = createAdminClient() as any;

     const { data } = await supabase
          .from("appointment_access_tokens")
          .select("id, token_prefix, purpose, expires_at, last_used_at, use_count, revoked_at, revocation_reason, created_at")
          .eq("tenant_id", tenantId)
          .eq("appointment_id", appointmentId)
          .eq("purpose", "manage_appointment")
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

     if (!data) return null;

     return {
          id: String(data.id),
          tokenPrefix: String(data.token_prefix),
          purpose: String(data.purpose),
          expiresAt: String(data.expires_at),
          lastUsedAt: data.last_used_at ? String(data.last_used_at) : null,
          useCount: Number(data.use_count),
          revokedAt: data.revoked_at ? String(data.revoked_at) : null,
          revocationReason: data.revocation_reason ? String(data.revocation_reason) : null,
          createdAt: String(data.created_at),
     };
}

export async function getTokenHistoryForAppointment(
     tenantId: string,
     appointmentId: string,
     limit = 20
): Promise<TokenMetadataSummary[]> {
     const supabase = createAdminClient() as any;

     const { data } = await supabase
          .from("appointment_access_tokens")
          .select("id, token_prefix, purpose, expires_at, last_used_at, use_count, revoked_at, revocation_reason, created_at")
          .eq("tenant_id", tenantId)
          .eq("appointment_id", appointmentId)
          .eq("purpose", "manage_appointment")
          .order("created_at", { ascending: false })
          .limit(limit);

     return (data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          tokenPrefix: String(row.token_prefix),
          purpose: String(row.purpose),
          expiresAt: String(row.expires_at),
          lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
          useCount: Number(row.use_count),
          revokedAt: row.revoked_at ? String(row.revoked_at) : null,
          revocationReason: row.revocation_reason ? String(row.revocation_reason) : null,
          createdAt: String(row.created_at),
     }));
}

export async function getOrCreateManageAppointmentUrlForAppointment(input: {
     tenantId: string;
     appointmentId: string;
}): Promise<string> {
     const supabase = createAdminClient() as any;

     const { data } = await supabase
          .from("appointment_access_tokens")
          .select("id, token_hash, token_ciphertext, token_iv, token_auth_tag, encryption_key_version, expires_at, revoked_at")
          .eq("tenant_id", input.tenantId)
          .eq("appointment_id", input.appointmentId)
          .eq("purpose", "manage_appointment")
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

     if (data) {
          const expiresAtMs = new Date(String(data.expires_at)).getTime();
          if (Number.isFinite(expiresAtMs) && expiresAtMs > Date.now()) {
               try {
                    const rawToken = decryptAppointmentAccessToken({
                         ciphertext: String(data.token_ciphertext),
                         iv: String(data.token_iv),
                         authTag: String(data.token_auth_tag),
                         keyVersion: Number(data.encryption_key_version),
                    });

                    const recomputedHash = hashAppointmentAccessToken(rawToken);
                    if (recomputedHash === String(data.token_hash)) {
                         return getManageAppointmentUrl(rawToken);
                    }
               } catch {
                    // Fail closed and fall through to rotation.
               }
          }
     }

     const created = await createAppointmentAccessToken({
          tenantId: input.tenantId,
          appointmentId: input.appointmentId,
          revocationReason: "regenerated_for_notification",
     });

     return getManageAppointmentUrl(created.rawToken);
}

export async function getCustomerActionHistoryForAppointment(
     tenantId: string,
     appointmentId: string,
     limit = 100
): Promise<CustomerActionLogItem[]> {
     const supabase = createAdminClient() as any;

     const { data } = await supabase
          .from("appointment_customer_actions")
          .select("id, action_type, status, previous_starts_at, new_starts_at, previous_resource_id, new_resource_id, reason, failure_code, user_agent_summary, created_at")
          .eq("tenant_id", tenantId)
          .eq("appointment_id", appointmentId)
          .order("created_at", { ascending: false })
          .limit(limit);

     return (data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          actionType: String(row.action_type),
          status: String(row.status) as "success" | "failed",
          previousStartsAt: row.previous_starts_at ? String(row.previous_starts_at) : null,
          newStartsAt: row.new_starts_at ? String(row.new_starts_at) : null,
          previousResourceId: row.previous_resource_id ? String(row.previous_resource_id) : null,
          newResourceId: row.new_resource_id ? String(row.new_resource_id) : null,
          reason: row.reason ? String(row.reason) : null,
          failureCode: row.failure_code ? String(row.failure_code) : null,
          userAgentSummary: row.user_agent_summary ? String(row.user_agent_summary) : null,
          createdAt: String(row.created_at),
     }));
}

export async function resolveAppointmentAccessToken(
     rawToken: string,
     options: ResolveOptions = {}
): Promise<ResolveAppointmentAccessResult> {
     const tokenHash = hashAppointmentAccessToken(rawToken);
     const tokenRow = await loadTokenByHash(tokenHash);

     if (!tokenRow) {
          return { available: false, message: MANAGE_APPOINTMENT_UNAVAILABLE_MESSAGE };
     }

     const now = new Date();
     const expiresAt = new Date(tokenRow.expires_at);

     if (tokenRow.revoked_at || expiresAt.getTime() <= now.getTime()) {
          return { available: false, message: MANAGE_APPOINTMENT_UNAVAILABLE_MESSAGE };
     }

     if (!tokenRow.appointments || !tokenRow.tenants) {
          return { available: false, message: MANAGE_APPOINTMENT_UNAVAILABLE_MESSAGE };
     }

     const appointment = tokenRow.appointments;

     const resolvedRules = await getResolvedBookingRules(
          appointment.tenant_id,
          appointment.service_id
     );

     const statusEligible = ACTIVE_ACTION_STATUSES.has(appointment.status);

     const cancellationEligibility = canCustomerCancelAppointment(
          resolvedRules,
          appointment.starts_at,
          now
     );

     const rescheduleEligibility = canCustomerRescheduleAppointment(
          resolvedRules,
          appointment.starts_at,
          now
     );

     const { cancellationDeadline, rescheduleDeadline } = resolveActionDeadlines(
          appointment.starts_at,
          resolvedRules.cancellationNoticeMinutes,
          resolvedRules.rescheduleNoticeMinutes
     );

     const canCancel = statusEligible && cancellationEligibility.allowed;
     const canReschedule = statusEligible && rescheduleEligibility.allowed;

     if (options.recordUsage) {
          const supabase = createAdminClient() as any;

          // Track one logical view, not repeated rapid re-reads.
          const allowUsageWrite = !tokenRow.last_used_at
               || now.getTime() - new Date(tokenRow.last_used_at).getTime() > 60_000;

          if (allowUsageWrite) {
               await supabase
                    .from("appointment_access_tokens")
                    .update({
                         last_used_at: now.toISOString(),
                         use_count: tokenRow.use_count + 1,
                         updated_at: now.toISOString(),
                    })
                    .eq("id", tokenRow.id);

               await appendCustomerActionLog({
                    tenantId: tokenRow.tenant_id,
                    appointmentId: tokenRow.appointment_id,
                    accessTokenId: tokenRow.id,
                    actionType: "viewed",
                    status: "success",
                    ipAddress: options.ipAddress ?? null,
                    userAgent: options.userAgent ?? null,
               });
          }
     }

     const dto = toPublicManagedAppointment(
          tokenRow,
          canCancel,
          canReschedule,
          cancellationDeadline,
          rescheduleDeadline
     );

     const value: ManagedTokenResolution = {
          tokenId: tokenRow.id,
          tokenPrefix: tokenRow.token_prefix,
          tenantId: tokenRow.tenant_id,
          appointmentId: tokenRow.appointment_id,
          appointment: dto,
     };

     return {
          available: true,
          value,
     };
}

export async function checkCustomerActionRateLimit(input: {
     accessTokenId: string;
     ipAddress?: string | null;
     actionGroup: "page" | "availability" | "mutation";
}): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
     const supabase = createAdminClient() as any;

     const windowMinutes = 10;
     const pageLimit = 60;
     const availabilityLimit = 60;
     const mutationLimit = 10;

     const threshold = new Date(Date.now() - windowMinutes * 60_000).toISOString();
     const ipHash = input.ipAddress ? hashClientIp(input.ipAddress) : null;

     const actionTypes = input.actionGroup === "page"
          ? ["viewed"]
          : input.actionGroup === "availability"
               ? ["reschedule_started", "failed"]
               : ["cancellation_requested", "reschedule_started", "failed", "cancelled", "rescheduled"];

     let query = supabase
          .from("appointment_customer_actions")
          .select("id", { count: "exact", head: true })
          .eq("access_token_id", input.accessTokenId)
          .gte("created_at", threshold)
          .in("action_type", actionTypes);

     if (ipHash) {
          query = query.eq("ip_hash", ipHash);
     }

     const { count } = await query;
     const total = count ?? 0;

     const limit = input.actionGroup === "page"
          ? pageLimit
          : input.actionGroup === "availability"
               ? availabilityLimit
               : mutationLimit;

     if (total >= limit) {
          return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
     }

     return { allowed: true };
}

export async function upsertCustomerIdempotencyRequest(input: {
     tenantId: string;
     appointmentId: string;
     accessTokenId: string;
     requestType: "cancel" | "reschedule";
     idempotencyKey: string;
     payload: unknown;
}): Promise<
     | { status: "new"; requestId: string; requestHash: string }
     | { status: "replay"; resultSnapshot: unknown }
     | { status: "mismatch" }
> {
     const supabase = createAdminClient() as any;
     const requestHash = hashRequestPayload(input.payload);

     const { data: existing } = await supabase
          .from("appointment_customer_requests")
          .select("id, request_hash, result_snapshot")
          .eq("access_token_id", input.accessTokenId)
          .eq("request_type", input.requestType)
          .eq("idempotency_key", input.idempotencyKey)
          .maybeSingle();

     if (existing) {
          if (String(existing.request_hash) !== requestHash) {
               return { status: "mismatch" };
          }
          return {
               status: "replay",
               resultSnapshot: existing.result_snapshot ?? null,
          };
     }

     const { data: inserted, error } = await supabase
          .from("appointment_customer_requests")
          .insert({
               tenant_id: input.tenantId,
               appointment_id: input.appointmentId,
               access_token_id: input.accessTokenId,
               request_type: input.requestType,
               idempotency_key: input.idempotencyKey,
               request_hash: requestHash,
               status: "in_progress",
          })
          .select("id")
          .single();

     if (error || !inserted) {
          // Race safety: another request might have inserted first.
          const { data: retriedExisting } = await supabase
               .from("appointment_customer_requests")
               .select("id, request_hash, result_snapshot")
               .eq("access_token_id", input.accessTokenId)
               .eq("request_type", input.requestType)
               .eq("idempotency_key", input.idempotencyKey)
               .maybeSingle();

          if (!retriedExisting) {
               throw new Error("Failed to persist idempotency request");
          }

          if (String(retriedExisting.request_hash) !== requestHash) {
               return { status: "mismatch" };
          }

          return {
               status: "replay",
               resultSnapshot: retriedExisting.result_snapshot ?? null,
          };
     }

     return {
          status: "new",
          requestId: String(inserted.id),
          requestHash,
     };
}

export async function completeCustomerIdempotencyRequest(input: {
     requestId: string;
     status: "succeeded" | "failed";
     resultSnapshot: unknown;
}): Promise<void> {
     const supabase = createAdminClient() as any;

     await supabase
          .from("appointment_customer_requests")
          .update({
               status: input.status,
               result_snapshot: input.resultSnapshot,
               completed_at: new Date().toISOString(),
          })
          .eq("id", input.requestId);
}

export async function recordManagedAppointmentAction(input: {
     tenantId: string;
     appointmentId: string;
     accessTokenId: string;
     actionType:
     | "cancellation_requested"
     | "cancelled"
     | "reschedule_started"
     | "rescheduled"
     | "failed";
     status: "success" | "failed";
     previousStartsAt?: string | null;
     newStartsAt?: string | null;
     previousResourceId?: string | null;
     newResourceId?: string | null;
     reason?: string | null;
     failureCode?: string | null;
     ipAddress?: string | null;
     userAgent?: string | null;
}): Promise<void> {
     await appendCustomerActionLog({
          tenantId: input.tenantId,
          appointmentId: input.appointmentId,
          accessTokenId: input.accessTokenId,
          actionType: input.actionType,
          status: input.status,
          previousStartsAt: input.previousStartsAt ?? null,
          newStartsAt: input.newStartsAt ?? null,
          previousResourceId: input.previousResourceId ?? null,
          newResourceId: input.newResourceId ?? null,
          reason: input.reason ?? null,
          failureCode: input.failureCode ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
     });
}
