/**
 * Domain types for appointment notifications — Milestone 6.12.
 *
 * Defines the notification data model: settings, templates, outbox entries,
 * delivery attempts, payloads, provider interfaces, and all input/output shapes.
 */

// ─── Event Types ─────────────────────────────────────────────────────────────

export const NOTIFICATION_EVENT_TYPES = [
  "appointment_created",
  "appointment_rescheduled",
  "appointment_cancelled",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

// ─── Template Types ──────────────────────────────────────────────────────────

export const NOTIFICATION_TEMPLATE_TYPES = [
  "appointment_created",
  "appointment_rescheduled",
  "appointment_cancelled",
] as const;

export type NotificationTemplateType = (typeof NOTIFICATION_TEMPLATE_TYPES)[number];

// ─── Outbox Statuses ─────────────────────────────────────────────────────────

export const NOTIFICATION_OUTBOX_STATUSES = [
  "pending",
  "processing",
  "sent",
  "failed",
  "cancelled",
] as const;

export type NotificationOutboxStatus = (typeof NOTIFICATION_OUTBOX_STATUSES)[number];

// ─── Delivery Statuses ───────────────────────────────────────────────────────

export const NOTIFICATION_DELIVERY_STATUSES = [
  "processing",
  "sent",
  "failed",
] as const;

export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

// ─── Channels ────────────────────────────────────────────────────────────────

export const NOTIFICATION_CHANNELS = ["email"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// ─── Tenant Notification Settings ────────────────────────────────────────────

export type TenantNotificationSettings = {
  id: string;
  tenantId: string;
  emailNotificationsEnabled: boolean;
  sendBookingConfirmation: boolean;
  sendRescheduleConfirmation: boolean;
  sendCancellationConfirmation: boolean;
  replyToEmail: string | null;
  senderName: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Resolved settings (always returns defaults when no row exists) */
export type ResolvedNotificationSettings = {
  emailNotificationsEnabled: boolean;
  sendBookingConfirmation: boolean;
  sendRescheduleConfirmation: boolean;
  sendCancellationConfirmation: boolean;
  replyToEmail: string | null;
  senderName: string | null;
};

export const DEFAULT_NOTIFICATION_SETTINGS: ResolvedNotificationSettings = {
  emailNotificationsEnabled: true,
  sendBookingConfirmation: true,
  sendRescheduleConfirmation: true,
  sendCancellationConfirmation: true,
  replyToEmail: null,
  senderName: null,
};

// ─── Notification Templates ──────────────────────────────────────────────────

export type NotificationTemplate = {
  id: string;
  tenantId: string;
  templateType: NotificationTemplateType;
  subjectTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─── Supported Template Variables ────────────────────────────────────────────

export const SUPPORTED_TEMPLATE_VARIABLES = [
  "tenant_name",
  "appointment_number",
  "customer_name",
  "service_name",
  "resource_name",
  "location_name",
  "appointment_date",
  "appointment_start_time",
  "appointment_end_time",
  "time_zone",
  "price",
  "currency",
  "cancellation_reason",
] as const;

export type TemplateVariable = (typeof SUPPORTED_TEMPLATE_VARIABLES)[number];

export const TEMPLATE_VARIABLE_LABELS: Record<TemplateVariable, string> = {
  tenant_name: "Business Name",
  appointment_number: "Appointment Number",
  customer_name: "Customer Name",
  service_name: "Service Name",
  resource_name: "Resource/Staff Name",
  location_name: "Location Name",
  appointment_date: "Appointment Date",
  appointment_start_time: "Start Time",
  appointment_end_time: "End Time",
  time_zone: "Time Zone",
  price: "Price",
  currency: "Currency",
  cancellation_reason: "Cancellation Reason",
};

// ─── Notification Outbox ─────────────────────────────────────────────────────

export type NotificationOutboxEntry = {
  id: string;
  tenantId: string;
  appointmentId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  recipientEmail: string;
  templateType: NotificationTemplateType;
  payload: AppointmentNotificationPayload;
  idempotencyKey: string;
  status: NotificationOutboxStatus;
  attemptCount: number;
  nextAttemptAt: string;
  lockedAt: string | null;
  lockedBy: string | null;
  processedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  renderedSubject: string | null;
  renderedHtml: string | null;
  renderedText: string | null;
  senderName: string | null;
  replyToEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Notification Delivery ───────────────────────────────────────────────────

export type NotificationDelivery = {
  id: string;
  tenantId: string;
  outboxId: string;
  provider: string;
  providerMessageId: string | null;
  attemptNumber: number;
  status: NotificationDeliveryStatus;
  errorCode: string | null;
  errorMessage: string | null;
  responseMetadata: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
};

// ─── Appointment Notification Payload ────────────────────────────────────────

export type AppointmentNotificationPayload = {
  appointmentId: string;
  appointmentNumber: string;
  customerName: string;
  customerEmail: string;

  serviceName: string;
  resourceName: string;
  locationName: string;

  startsAt: string;
  endsAt: string;
  tenantTimeZone: string;

  price: string;
  currency: string;

  previousStartsAt?: string;
  previousEndsAt?: string;

  cancellationReason?: string | null;

  tenantName: string;
};

// ─── Email Provider Interface ────────────────────────────────────────────────

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName: string;
  replyTo?: string | null;
  idempotencyKey: string;
};

export type SendEmailResult =
  | {
    success: true;
    providerMessageId: string | null;
  }
  | {
    success: false;
    retryable: boolean;
    errorCode: string;
    safeMessage: string;
  };

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

// ─── Template Rendering ──────────────────────────────────────────────────────

export type TemplateVariableValues = Partial<Record<TemplateVariable, string>>;

export type RenderedTemplate = {
  subject: string;
  html: string;
  text: string;
};

// ─── Enqueue Input ───────────────────────────────────────────────────────────

export type EnqueueNotificationInput = {
  tenantId: string;
  appointmentId: string;
  eventType: NotificationEventType;
  payload: AppointmentNotificationPayload;
  idempotencyKey: string;
};

export type EnqueueNotificationResult =
  | { status: "created"; outboxId: string }
  | { status: "duplicate"; outboxId: string }
  | { status: "skipped"; reason: string }
  | { status: "error"; reason: string };

// ─── Processing Result ───────────────────────────────────────────────────────

export type ProcessNotificationResult = {
  outboxId: string;
  status: "sent" | "failed" | "retrying";
  providerMessageId?: string | null;
  errorCode?: string;
  safeMessage?: string;
};

export type ProcessBatchResult = {
  processed: number;
  sent: number;
  failed: number;
  retrying: number;
  results: ProcessNotificationResult[];
};

// ─── Outbox List Item (for UI display) ───────────────────────────────────────

export type NotificationOutboxListItem = {
  id: string;
  eventType: NotificationEventType;
  recipientEmail: string;
  status: NotificationOutboxStatus;
  attemptCount: number;
  lastErrorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
};

// ─── Settings Input ──────────────────────────────────────────────────────────

export type UpdateNotificationSettingsInput = {
  emailNotificationsEnabled: boolean;
  sendBookingConfirmation: boolean;
  sendRescheduleConfirmation: boolean;
  sendCancellationConfirmation: boolean;
  replyToEmail?: string | null;
  senderName?: string | null;
};

// ─── Template Update Input ───────────────────────────────────────────────────

export type UpdateTemplateInput = {
  templateType: NotificationTemplateType;
  subjectTemplate: string;
  bodyTemplate: string;
  isActive?: boolean;
};

// ─── Retry Policy ────────────────────────────────────────────────────────────

export const NOTIFICATION_RETRY_POLICY = {
  maxAttempts: 5,
  delays: [
    0,          // Attempt 1: immediate
    60,         // Attempt 2: 1 minute
    300,        // Attempt 3: 5 minutes
    1800,       // Attempt 4: 30 minutes
    7200,       // Attempt 5: 2 hours
  ],
} as const;

// ─── Provider Names ──────────────────────────────────────────────────────────

export const EMAIL_PROVIDERS = ["console", "nodemailer"] as const;

export type EmailProviderName = (typeof EMAIL_PROVIDERS)[number];
