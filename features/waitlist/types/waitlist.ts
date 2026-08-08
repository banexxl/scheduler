/**
 * Waitlist Domain Types — Milestone 8.8.
 */

// ─── Entry Statuses ──────────────────────────────────────────────────────────

export const WAITLIST_ENTRY_STATUSES = ["active", "matched", "booked", "expired", "cancelled"] as const;
export type WaitlistEntryStatus = (typeof WAITLIST_ENTRY_STATUSES)[number];

// ─── Offer Statuses ──────────────────────────────────────────────────────────

export const WAITLIST_OFFER_STATUSES = ["pending", "notified", "accepted", "expired", "cancelled", "stale"] as const;
export type WaitlistOfferStatus = (typeof WAITLIST_OFFER_STATUSES)[number];

// ─── Waitlist Entry ──────────────────────────────────────────────────────────

export type WaitlistEntry = {
  id: string;
  tenantId: string;
  serviceId: string;
  locationId: string;
  resourceId: string | null;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  preferredDateFrom: string;
  preferredDateTo: string;
  preferredTimeFrom: string | null;
  preferredTimeTo: string | null;
  allowAnyResource: boolean;
  status: WaitlistEntryStatus;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Waitlist Entry List Item ────────────────────────────────────────────────

export type WaitlistEntryListItem = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  serviceName: string;
  locationName: string;
  resourceName: string | null;
  preferredDateFrom: string;
  preferredDateTo: string;
  preferredTimeFrom: string | null;
  preferredTimeTo: string | null;
  allowAnyResource: boolean;
  status: WaitlistEntryStatus;
  createdAt: string;
};

// ─── Waitlist Offer ──────────────────────────────────────────────────────────

export type WaitlistOffer = {
  id: string;
  tenantId: string;
  waitlistEntryId: string;
  serviceId: string;
  locationId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: WaitlistOfferStatus;
  expiresAt: string;
  createdAt: string;
};

// ─── Public Waitlist Entry ───────────────────────────────────────────────────

export type PublicWaitlistEntry = {
  serviceName: string;
  locationName: string;
  resourcePreference: string;
  dateFrom: string;
  dateTo: string;
  timeFrom: string | null;
  timeTo: string | null;
  status: string;
};

// ─── Join Input ──────────────────────────────────────────────────────────────

export type JoinWaitlistInput = {
  serviceId: string;
  locationId: string;
  resourceId?: string | null;
  allowAnyResource?: boolean;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  preferredDateFrom: string;
  preferredDateTo: string;
  preferredTimeFrom?: string | null;
  preferredTimeTo?: string | null;
  notes?: string | null;
};
