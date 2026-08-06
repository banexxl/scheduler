import type { AppointmentStatus } from "@/features/appointments/types/appointment";

export type PublicAppointmentStatus = AppointmentStatus;

export type PublicManagedAppointment = {
     appointmentNumber: string;
     status: PublicAppointmentStatus;

     serviceName: string;
     resourceName: string | null;
     locationName: string;

     startsAt: string;
     endsAt: string;
     localDate: string;
     localStartTime: string;
     localEndTime: string;
     timeZone: string;

     durationMinutes: number;
     price: string;
     currency: string;

     tenantName: string;
     tenantLogoUrl?: string | null;

     canCancel: boolean;
     canReschedule: boolean;
     cancellationDeadline?: string | null;
     rescheduleDeadline?: string | null;
};

export type AppointmentAccessTokenRow = {
     id: string;
     tenant_id: string;
     appointment_id: string;
     token_hash: string;
     token_prefix: string;
     purpose: "manage_appointment";
     expires_at: string;
     last_used_at: string | null;
     use_count: number;
     revoked_at: string | null;
     revocation_reason: string | null;
     token_ciphertext: string;
     token_iv: string;
     token_auth_tag: string;
     encryption_key_version: number;
     created_at: string;
     updated_at: string;
};

export type ManagedTokenResolution = {
     tokenId: string;
     tokenPrefix: string;
     tenantId: string;
     appointmentId: string;
     appointment: PublicManagedAppointment;
};

export type AccessUnavailable = {
     available: false;
     message: string;
};

export type AccessAvailable = {
     available: true;
     value: ManagedTokenResolution;
};

export type ResolveAppointmentAccessResult = AccessUnavailable | AccessAvailable;

export type TokenMetadataSummary = {
     id: string;
     tokenPrefix: string;
     purpose: string;
     expiresAt: string;
     lastUsedAt: string | null;
     useCount: number;
     revokedAt: string | null;
     revocationReason: string | null;
     createdAt: string;
};

export type CustomerActionLogItem = {
     id: string;
     actionType: string;
     status: "success" | "failed";
     previousStartsAt: string | null;
     newStartsAt: string | null;
     previousResourceId: string | null;
     newResourceId: string | null;
     reason: string | null;
     failureCode: string | null;
     userAgentSummary: string | null;
     createdAt: string;
};
