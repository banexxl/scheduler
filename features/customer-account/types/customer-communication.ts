/**
 * Customer Communication Types — Milestone 9.4.
 */

// ─── Communication Item ──────────────────────────────────────────────────────

export type CustomerCommunicationType =
  | "appointment_confirmation"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "appointment_reminder"
  | "review_request"
  | "waitlist_offer";

export type CustomerCommunicationStatus = "queued" | "sent" | "failed";

export type CustomerCommunicationItem = {
  id: string;
  tenantSlug: string;
  tenantName: string;
  tenantLogoUrl: string | null;
  type: CustomerCommunicationType;
  title: string;
  sentAt: string | null;
  status: CustomerCommunicationStatus;
  appointmentNumber?: string | null;
};

// ─── Resolved Preferences ────────────────────────────────────────────────────

export type ResolvedCustomerCommunicationPreferences = {
  appointmentReminders: {
    supported: boolean;
    enabled: boolean;
  };
  reviewRequests: {
    supported: boolean;
    enabled: boolean;
  };
  waitlistNotifications: {
    supported: boolean;
    enabled: boolean;
  };
};

// ─── Customer Preference DTO ─────────────────────────────────────────────────

export type CustomerBusinessPreferences = {
  tenantSlug: string;
  tenantName: string;
  tenantLogoUrl: string | null;
  preferences: ResolvedCustomerCommunicationPreferences;
};

// ─── Raw Preference Row ──────────────────────────────────────────────────────

export type CustomerNotificationPreferenceRow = {
  appointmentRemindersEnabled: boolean;
  reviewRequestsEnabled: boolean;
  waitlistNotificationsEnabled: boolean;
};

export const DEFAULT_CUSTOMER_PREFERENCES: CustomerNotificationPreferenceRow = {
  appointmentRemindersEnabled: true,
  reviewRequestsEnabled: true,
  waitlistNotificationsEnabled: true,
};
