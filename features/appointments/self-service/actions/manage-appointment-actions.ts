"use server";

import { headers } from "next/headers";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { calculateAvailability } from "@/features/availability/services/calculate-availability";
import { cancelAppointment, rescheduleAppointment } from "@/features/appointments/services/update-appointment";
import { getAppointmentById } from "@/features/appointments/services/appointment-queries";
import {
     cancelByTokenSchema,
     rescheduleAvailabilityByTokenSchema,
     rescheduleByTokenSchema,
} from "../schemas";
import {
     checkCustomerActionRateLimit,
     completeCustomerIdempotencyRequest,
     createAppointmentAccessToken,
     getActiveTokenMetadataForAppointment,
     getCustomerActionHistoryForAppointment,
     getManageAppointmentUrl,
     getTokenUnavailableMessage,
     getTokenHistoryForAppointment,
     recordManagedAppointmentAction,
     resolveAppointmentAccessToken,
     revokeAppointmentAccessToken,
     upsertCustomerIdempotencyRequest,
} from "../services/appointment-self-service";
import { isTrustedMutationOrigin } from "../security";
import {
     cancelPendingRemindersForAppointment,
     enqueueAppointmentCancellationNotification,
     enqueueAppointmentCreatedNotification,
     enqueueAppointmentRescheduledNotification,
     synchronizeRemindersAfterReschedule,
} from "../services/self-service-side-effects";

type ActionSuccess<T> = { success: true; data: T };
type ActionError = { success: false; error: string; code?: string };

async function getRequestMeta(): Promise<{
     ipAddress: string | null;
     userAgent: string | null;
     origin: string | null;
     referer: string | null;
}> {
     const h = await headers();
     const forwardedFor = h.get("x-forwarded-for");
     const firstIp = forwardedFor?.split(",")[0]?.trim() || null;
     return {
          ipAddress: firstIp,
          userAgent: h.get("user-agent"),
          origin: h.get("origin"),
          referer: h.get("referer"),
     };
}

function unavailableError(): ActionError {
     return {
          success: false,
          error: getTokenUnavailableMessage(),
          code: "TOKEN_UNAVAILABLE",
     };
}

function untrustedOriginError(): ActionError {
     return {
          success: false,
          error: "Request origin is not allowed.",
          code: "ORIGIN_NOT_ALLOWED",
     };
}

export async function getManagedAppointmentByTokenAction(
     token: string
): Promise<ActionSuccess<{ appointment: unknown }> | ActionError> {
     const meta = await getRequestMeta();

     const resolved = await resolveAppointmentAccessToken(token, {
          recordUsage: true,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
     });

     if (!resolved.available) {
          return unavailableError();
     }

     const rateLimit = await checkCustomerActionRateLimit({
          accessTokenId: resolved.value.tokenId,
          ipAddress: meta.ipAddress,
          actionGroup: "page",
     });

     if (!rateLimit.allowed) {
          return {
               success: false,
               error: "Please wait a moment and try again.",
               code: "RATE_LIMITED",
          };
     }

     return {
          success: true,
          data: {
               appointment: resolved.value.appointment,
          },
     };
}

export async function getRescheduleAvailabilityByTokenAction(
     token: string,
     input: {
          localDate: string;
          resourceId?: string | null;
     }
): Promise<ActionSuccess<{ resources: unknown[]; reasonCode?: string }> | ActionError> {
     const meta = await getRequestMeta();

     if (!isTrustedMutationOrigin({ origin: meta.origin, referer: meta.referer })) {
          return untrustedOriginError();
     }

     try {
          const validated = await rescheduleAvailabilityByTokenSchema.validate(input, {
               abortEarly: false,
               stripUnknown: true,
          });

          const resolved = await resolveAppointmentAccessToken(token);
          if (!resolved.available) {
               return unavailableError();
          }

          const rateLimit = await checkCustomerActionRateLimit({
               accessTokenId: resolved.value.tokenId,
               ipAddress: meta.ipAddress,
               actionGroup: "availability",
          });

          if (!rateLimit.allowed) {
               return {
                    success: false,
                    error: "Please wait a moment before trying again.",
                    code: "RATE_LIMITED",
               };
          }

          const appointment = await getAppointmentById(
               resolved.value.tenantId,
               resolved.value.appointmentId
          );

          if (!appointment) {
               return unavailableError();
          }

          const availability = await calculateAvailability(
               {
                    tenantId: resolved.value.tenantId,
                    serviceId: appointment.serviceId,
                    locationId: appointment.locationId,
                    resourceId: validated.resourceId ?? null,
                    localDate: validated.localDate,
               },
               new Date(),
               {
                    excludeAppointmentId: appointment.id,
               }
          );

          await recordManagedAppointmentAction({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               accessTokenId: resolved.value.tokenId,
               actionType: "reschedule_started",
               status: "success",
               ipAddress: meta.ipAddress,
               userAgent: meta.userAgent,
          });

          return {
               success: true,
               data: {
                    resources: availability.resources,
                    reasonCode: availability.reasonCode,
               },
          };
     } catch (error) {
          if (error instanceof Error && error.name === "ValidationError") {
               return { success: false, error: "Invalid availability input", code: "VALIDATION_ERROR" };
          }
          return { success: false, error: "Failed to load availability", code: "AVAILABILITY_FAILED" };
     }
}

export async function cancelAppointmentByTokenAction(
     token: string,
     input: {
          reason?: string | null;
          idempotencyKey: string;
     }
): Promise<ActionSuccess<{ appointment: unknown }> | ActionError> {
     const meta = await getRequestMeta();

     if (!isTrustedMutationOrigin({ origin: meta.origin, referer: meta.referer })) {
          return untrustedOriginError();
     }

     try {
          const validated = await cancelByTokenSchema.validate(input, {
               abortEarly: false,
               stripUnknown: true,
          });

          const resolved = await resolveAppointmentAccessToken(token);
          if (!resolved.available) {
               return unavailableError();
          }

          const limit = await checkCustomerActionRateLimit({
               accessTokenId: resolved.value.tokenId,
               ipAddress: meta.ipAddress,
               actionGroup: "mutation",
          });
          if (!limit.allowed) {
               return { success: false, error: "Please wait before retrying.", code: "RATE_LIMITED" };
          }

          const idempotency = await upsertCustomerIdempotencyRequest({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               accessTokenId: resolved.value.tokenId,
               requestType: "cancel",
               idempotencyKey: validated.idempotencyKey,
               payload: {
                    reason: validated.reason ?? null,
               },
          });

          if (idempotency.status === "mismatch") {
               return {
                    success: false,
                    error: "This request key was already used with different data.",
                    code: "IDEMPOTENCY_KEY_REUSED",
               };
          }

          if (idempotency.status === "replay") {
               return {
                    success: true,
                    data: {
                         appointment: idempotency.resultSnapshot,
                    },
               };
          }

          const current = await getAppointmentById(
               resolved.value.tenantId,
               resolved.value.appointmentId
          );
          if (!current) {
               await completeCustomerIdempotencyRequest({
                    requestId: idempotency.requestId,
                    status: "failed",
                    resultSnapshot: { message: "not_found" },
               });
               return unavailableError();
          }

          if (current.status === "cancelled") {
               await completeCustomerIdempotencyRequest({
                    requestId: idempotency.requestId,
                    status: "succeeded",
                    resultSnapshot: resolved.value.appointment,
               });

               return {
                    success: true,
                    data: {
                         appointment: resolved.value.appointment,
                    },
               };
          }

          if (!resolved.value.appointment.canCancel) {
               await recordManagedAppointmentAction({
                    tenantId: resolved.value.tenantId,
                    appointmentId: resolved.value.appointmentId,
                    accessTokenId: resolved.value.tokenId,
                    actionType: "failed",
                    status: "failed",
                    reason: validated.reason ?? null,
                    failureCode: "CANCELLATION_NOT_ALLOWED",
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
               });

               await completeCustomerIdempotencyRequest({
                    requestId: idempotency.requestId,
                    status: "failed",
                    resultSnapshot: {
                         code: "CANCELLATION_NOT_ALLOWED",
                    },
               });

               return {
                    success: false,
                    error: "Cancellation is not available for this appointment.",
                    code: "CANCELLATION_NOT_ALLOWED",
               };
          }

          await recordManagedAppointmentAction({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               accessTokenId: resolved.value.tokenId,
               actionType: "cancellation_requested",
               status: "success",
               reason: validated.reason ?? null,
               ipAddress: meta.ipAddress,
               userAgent: meta.userAgent,
          });

          const cancelled = await cancelAppointment({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               reason: validated.reason ?? null,
               cancelledBy: null,
          });

          if (!cancelled.success) {
               await recordManagedAppointmentAction({
                    tenantId: resolved.value.tenantId,
                    appointmentId: resolved.value.appointmentId,
                    accessTokenId: resolved.value.tokenId,
                    actionType: "failed",
                    status: "failed",
                    reason: validated.reason ?? null,
                    failureCode: cancelled.code ?? "CANCEL_FAILED",
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
               });

               await completeCustomerIdempotencyRequest({
                    requestId: idempotency.requestId,
                    status: "failed",
                    resultSnapshot: { code: cancelled.code ?? "CANCEL_FAILED" },
               });

               return {
                    success: false,
                    error: "Unable to cancel this appointment.",
                    code: cancelled.code ?? "CANCEL_FAILED",
               };
          }

          await cancelPendingRemindersForAppointment({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
          });

          await enqueueAppointmentCancellationNotification({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               manageAppointmentUrl: getManageAppointmentUrl(token),
          });

          const post = await resolveAppointmentAccessToken(token);

          const publicAppointment = post.available
               ? post.value.appointment
               : resolved.value.appointment;

          await recordManagedAppointmentAction({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               accessTokenId: resolved.value.tokenId,
               actionType: "cancelled",
               status: "success",
               reason: validated.reason ?? null,
               ipAddress: meta.ipAddress,
               userAgent: meta.userAgent,
          });

          await completeCustomerIdempotencyRequest({
               requestId: idempotency.requestId,
               status: "succeeded",
               resultSnapshot: publicAppointment,
          });

          return {
               success: true,
               data: {
                    appointment: publicAppointment,
               },
          };
     } catch (error) {
          if (error instanceof Error && error.name === "ValidationError") {
               return { success: false, error: "Invalid cancellation request", code: "VALIDATION_ERROR" };
          }
          return { success: false, error: "Failed to cancel appointment", code: "CANCEL_FAILED" };
     }
}

export async function rescheduleAppointmentByTokenAction(
     token: string,
     input: {
          localDate: string;
          localStartTime: string;
          resourceId?: string | null;
          reviewedPrice: string;
          reviewedCurrency: string;
          reviewedDurationMinutes: number;
          idempotencyKey: string;
     }
): Promise<ActionSuccess<{ appointment: unknown }> | ActionError> {
     const meta = await getRequestMeta();

     if (!isTrustedMutationOrigin({ origin: meta.origin, referer: meta.referer })) {
          return untrustedOriginError();
     }

     try {
          const validated = await rescheduleByTokenSchema.validate(input, {
               abortEarly: false,
               stripUnknown: true,
          });

          const resolved = await resolveAppointmentAccessToken(token);
          if (!resolved.available) {
               return unavailableError();
          }

          const limit = await checkCustomerActionRateLimit({
               accessTokenId: resolved.value.tokenId,
               ipAddress: meta.ipAddress,
               actionGroup: "mutation",
          });
          if (!limit.allowed) {
               return { success: false, error: "Please wait before retrying.", code: "RATE_LIMITED" };
          }

          const idempotency = await upsertCustomerIdempotencyRequest({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               accessTokenId: resolved.value.tokenId,
               requestType: "reschedule",
               idempotencyKey: validated.idempotencyKey,
               payload: validated,
          });

          if (idempotency.status === "mismatch") {
               return {
                    success: false,
                    error: "This request key was already used with different data.",
                    code: "IDEMPOTENCY_KEY_REUSED",
               };
          }

          if (idempotency.status === "replay") {
               return {
                    success: true,
                    data: {
                         appointment: idempotency.resultSnapshot,
                    },
               };
          }

          const current = await getAppointmentById(
               resolved.value.tenantId,
               resolved.value.appointmentId
          );
          if (!current) {
               await completeCustomerIdempotencyRequest({
                    requestId: idempotency.requestId,
                    status: "failed",
                    resultSnapshot: { message: "not_found" },
               });
               return unavailableError();
          }

          if (!resolved.value.appointment.canReschedule) {
               await recordManagedAppointmentAction({
                    tenantId: resolved.value.tenantId,
                    appointmentId: resolved.value.appointmentId,
                    accessTokenId: resolved.value.tokenId,
                    actionType: "failed",
                    status: "failed",
                    failureCode: "RESCHEDULE_NOT_ALLOWED",
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
               });

               await completeCustomerIdempotencyRequest({
                    requestId: idempotency.requestId,
                    status: "failed",
                    resultSnapshot: { code: "RESCHEDULE_NOT_ALLOWED" },
               });

               return {
                    success: false,
                    error: "Rescheduling is not available for this appointment.",
                    code: "RESCHEDULE_NOT_ALLOWED",
               };
          }

          const requestedResourceId = validated.resourceId ?? current.resourceId;

          const availability = await calculateAvailability(
               {
                    tenantId: resolved.value.tenantId,
                    serviceId: current.serviceId,
                    locationId: current.locationId,
                    resourceId: requestedResourceId,
                    localDate: validated.localDate,
               },
               new Date(),
               {
                    excludeAppointmentId: current.id,
               }
          );

          const resource = availability.resources.find((r) => r.resourceId === requestedResourceId);
          const slot = resource?.slots.find((s) => s.localStartTime === validated.localStartTime);

          if (!slot) {
               await recordManagedAppointmentAction({
                    tenantId: resolved.value.tenantId,
                    appointmentId: resolved.value.appointmentId,
                    accessTokenId: resolved.value.tokenId,
                    actionType: "failed",
                    status: "failed",
                    failureCode: "STALE_SLOT",
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
               });

               await completeCustomerIdempotencyRequest({
                    requestId: idempotency.requestId,
                    status: "failed",
                    resultSnapshot: { code: "STALE_SLOT" },
               });

               return {
                    success: false,
                    error: "That time is no longer available. Please choose another time.",
                    code: "STALE_SLOT",
               };
          }

          const slotPrice = String(slot.price);
          if (
               slotPrice !== validated.reviewedPrice
               || slot.currency !== validated.reviewedCurrency
               || slot.durationMinutes !== validated.reviewedDurationMinutes
          ) {
               await recordManagedAppointmentAction({
                    tenantId: resolved.value.tenantId,
                    appointmentId: resolved.value.appointmentId,
                    accessTokenId: resolved.value.tokenId,
                    actionType: "failed",
                    status: "failed",
                    failureCode: "DETAILS_CHANGED",
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
               });

               await completeCustomerIdempotencyRequest({
                    requestId: idempotency.requestId,
                    status: "failed",
                    resultSnapshot: { code: "DETAILS_CHANGED" },
               });

               return {
                    success: false,
                    error: "Appointment details changed. Please review and confirm again.",
                    code: "DETAILS_CHANGED",
               };
          }

          const previousStartsAt = current.startsAt;
          const previousResourceId = current.resourceId;

          const rescheduled = await rescheduleAppointment({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               serviceId: current.serviceId,
               locationId: current.locationId,
               resourceId: requestedResourceId,
               localDate: validated.localDate,
               localStartTime: validated.localStartTime,
               updatedBy: null,
          });

          if (!rescheduled.success) {
               await recordManagedAppointmentAction({
                    tenantId: resolved.value.tenantId,
                    appointmentId: resolved.value.appointmentId,
                    accessTokenId: resolved.value.tokenId,
                    actionType: "failed",
                    status: "failed",
                    failureCode: rescheduled.code ?? "RESCHEDULE_FAILED",
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
               });

               await completeCustomerIdempotencyRequest({
                    requestId: idempotency.requestId,
                    status: "failed",
                    resultSnapshot: { code: rescheduled.code ?? "RESCHEDULE_FAILED" },
               });

               return {
                    success: false,
                    error: "Unable to reschedule this appointment.",
                    code: rescheduled.code ?? "RESCHEDULE_FAILED",
               };
          }

          await synchronizeRemindersAfterReschedule({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               startsAt: rescheduled.appointment.startsAt,
               endsAt: rescheduled.appointment.endsAt,
          });

          await enqueueAppointmentRescheduledNotification({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               manageAppointmentUrl: getManageAppointmentUrl(token),
          });

          await recordManagedAppointmentAction({
               tenantId: resolved.value.tenantId,
               appointmentId: resolved.value.appointmentId,
               accessTokenId: resolved.value.tokenId,
               actionType: "rescheduled",
               status: "success",
               previousStartsAt,
               newStartsAt: rescheduled.appointment.startsAt,
               previousResourceId,
               newResourceId: rescheduled.appointment.resourceId,
               ipAddress: meta.ipAddress,
               userAgent: meta.userAgent,
          });

          const post = await resolveAppointmentAccessToken(token);
          const publicAppointment = post.available ? post.value.appointment : resolved.value.appointment;

          await completeCustomerIdempotencyRequest({
               requestId: idempotency.requestId,
               status: "succeeded",
               resultSnapshot: publicAppointment,
          });

          return {
               success: true,
               data: {
                    appointment: publicAppointment,
               },
          };
     } catch (error) {
          if (error instanceof Error && error.name === "ValidationError") {
               return { success: false, error: "Invalid reschedule request", code: "VALIDATION_ERROR" };
          }

          return { success: false, error: "Failed to reschedule appointment", code: "RESCHEDULE_FAILED" };
     }
}

export async function rotateAppointmentAccessTokenAction(
     tenantSlug: string,
     appointmentId: string,
     input?: {
          revocationReason?: string;
          sendNotification?: boolean;
     }
): Promise<ActionSuccess<{ manageUrl: string; expiresAt: string; tokenId: string }> | ActionError> {
     try {
          const meta = await getRequestMeta();
          if (!isTrustedMutationOrigin({ origin: meta.origin, referer: meta.referer })) {
               return untrustedOriginError();
          }

          const { tenant, membership } = await requireTenantMember(tenantSlug);
          if (!["owner", "admin"].includes(membership.role)) {
               return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
          }

          const created = await createAppointmentAccessToken({
               tenantId: tenant.id,
               appointmentId,
               revocationReason: input?.revocationReason ?? "rotated_by_admin",
          });

          const manageUrl = getManageAppointmentUrl(created.rawToken);

          if (input?.sendNotification) {
               await enqueueAppointmentCreatedNotification({
                    tenantId: tenant.id,
                    appointmentId,
                    manageAppointmentUrl: manageUrl,
               });
          }

          return {
               success: true,
               data: {
                    manageUrl,
                    expiresAt: created.expiresAt,
                    tokenId: created.tokenId,
               },
          };
     } catch {
          return {
               success: false,
               error: "Failed to rotate appointment management link.",
               code: "ROTATE_FAILED",
          };
     }
}

export async function revokeAppointmentAccessTokenAction(
     tenantSlug: string,
     appointmentId: string,
     tokenId: string,
     input?: { reason?: string }
): Promise<ActionSuccess<{ revoked: true }> | ActionError> {
     try {
          const meta = await getRequestMeta();
          if (!isTrustedMutationOrigin({ origin: meta.origin, referer: meta.referer })) {
               return untrustedOriginError();
          }

          const { tenant, membership } = await requireTenantMember(tenantSlug);
          if (!["owner", "admin"].includes(membership.role)) {
               return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
          }

          await revokeAppointmentAccessToken({
               tenantId: tenant.id,
               appointmentId,
               tokenId,
               reason: input?.reason ?? "revoked_by_admin",
          });

          return {
               success: true,
               data: { revoked: true },
          };
     } catch {
          return {
               success: false,
               error: "Failed to revoke appointment management link.",
               code: "REVOKE_FAILED",
          };
     }
}

export async function getAppointmentSelfServiceSummaryAction(
     tenantSlug: string,
     appointmentId: string
): Promise<
     ActionSuccess<{
          activeToken: unknown;
          tokenHistory: unknown[];
          customerActions: unknown[];
     }> | ActionError
> {
     try {
          const { tenant, membership } = await requireTenantMember(tenantSlug);

          if (!["owner", "admin", "manager"].includes(membership.role)) {
               return { success: false, error: "Insufficient permissions", code: "FORBIDDEN" };
          }

          const [activeToken, tokenHistory, customerActions] = await Promise.all([
               getActiveTokenMetadataForAppointment(tenant.id, appointmentId),
               getTokenHistoryForAppointment(tenant.id, appointmentId, 20),
               getCustomerActionHistoryForAppointment(tenant.id, appointmentId, 100),
          ]);

          return {
               success: true,
               data: {
                    activeToken,
                    tokenHistory,
                    customerActions,
               },
          };
     } catch {
          return {
               success: false,
               error: "Failed to load self-service details.",
               code: "SUMMARY_FAILED",
          };
     }
}

export async function generateExistingAppointmentManagementLinkAction(
     tenantSlug: string,
     appointmentId: string,
     input?: { sendNotification?: boolean }
): Promise<ActionSuccess<{ manageUrl: string; expiresAt: string; tokenId: string }> | ActionError> {
     return rotateAppointmentAccessTokenAction(tenantSlug, appointmentId, {
          revocationReason: "regenerated_by_admin",
          sendNotification: input?.sendNotification ?? false,
     });
}
