/**
 * Financial History Types — Milestone 11.8.
 */

export type FinancialHistoryItemType = "appointment_payment" | "package_purchase";

export type TenantFinancialHistoryItem = {
  id: string;
  type: FinancialHistoryItemType;
  customerName: string;
  description: string;
  status: string;
  originalAmount: number;
  discountAmount: number;
  paidAmount: number;
  refundedAmount: number;
  netCustomerPayment: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  appointmentNumber: string | null;
  receiptAvailable: boolean;
};

export type CustomerPaymentHistoryItem = {
  id: string;
  type: FinancialHistoryItemType;
  businessName: string;
  description: string;
  status: string;
  paidAmount: number;
  refundedAmount: number;
  netPaid: number;
  currency: string;
  paidAt: string | null;
  receiptAvailable: boolean;
};

export type CurrencySummary = {
  currency: string;
  paymentsReceived: number;
  refunded: number;
  netCustomerPayments: number;
  discountsApplied: number;
};

export type TenantPaymentSummary = {
  currencies: CurrencySummary[];
  totalAppointmentPayments: number;
  totalPackagePurchases: number;
  totalRefunds: number;
};

export type FinancialHistoryFilters = {
  type?: FinancialHistoryItemType | null;
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};
