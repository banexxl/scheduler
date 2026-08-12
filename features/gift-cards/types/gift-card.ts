/**
 * Gift Card Types — Milestone 15.2.
 */

// ─── Gift Card Status ────────────────────────────────────────────────────────

export type GiftCardStatus = "active" | "fully_redeemed" | "expired" | "disabled";

export type GiftCardPurchaseStatus =
  | "creating" | "pending" | "paid" | "fulfilled"
  | "failed" | "cancelled" | "refunded" | "requires_review";

export type LedgerEntryType =
  | "issuance" | "redemption" | "redemption_reversal"
  | "refund_adjustment" | "manual_adjustment" | "expiry";

export type ReservationStatus = "reserved" | "confirmed" | "released";

// ─── Gift Card DTO ───────────────────────────────────────────────────────────

export type GiftCardDTO = {
  id: string;
  tenantId: string;
  codePrefix: string;
  currency: string;
  initialAmount: number; // minor units
  currentBalance: number; // minor units
  status: GiftCardStatus;
  issuedAt: string;
  expiresAt: string | null;
  recipientName: string | null;
  claimedByCustomerAccountId: string | null;
};

// ─── Gift Card Product ───────────────────────────────────────────────────────

export type GiftCardProductDTO = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  amount: number; // minor units
  currency: string;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
};

// ─── Ledger Entry ────────────────────────────────────────────────────────────

export type GiftCardLedgerEntryDTO = {
  id: string;
  entryType: LedgerEntryType;
  amount: number; // positive = credit, negative = debit
  currency: string;
  description: string | null;
  referenceKey: string | null;
  createdAt: string;
};

// ─── Settings ────────────────────────────────────────────────────────────────

export type GiftCardSettingsDTO = {
  enabled: boolean;
  allowCustomAmount: boolean;
  minimumCustomAmount: number | null;
  maximumCustomAmount: number | null;
  expiresAfterDays: number | null;
  allowAppointmentRedemption: boolean;
  allowPackageRedemption: boolean;
};

// ─── Reservation ─────────────────────────────────────────────────────────────

export type GiftCardReservationDTO = {
  id: string;
  giftCardId: string;
  amount: number;
  currency: string;
  status: ReservationStatus;
  expiresAt: string | null;
  createdAt: string;
};
