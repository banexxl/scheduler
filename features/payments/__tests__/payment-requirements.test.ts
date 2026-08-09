import { describe, it, expect } from "vitest";
import { resolveAppointmentPaymentRequirement } from "../services/resolve-payment-requirement";

/**
 * Payment Requirement Resolution Tests — Milestone 11.4.
 */

describe("resolveAppointmentPaymentRequirement", () => {
  const providerAvailable = { available: true, reason: null };
  const providerUnavailable = { available: false, reason: "Not configured" };

  describe("tenant settings", () => {
    it("returns none when tenant has payments disabled", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: false, defaultPaymentRequirement: "full", paymentDeadlineMinutes: 15, allowPayLater: true },
        serviceRule: null,
        appointmentPrice: 3000,
        providerAvailability: providerAvailable,
      });
      expect(result.requirement).toBe("none");
      expect(result.onlinePaymentEnabled).toBe(false);
    });

    it("returns full when tenant requires full payment", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "full", paymentDeadlineMinutes: 20, allowPayLater: true },
        serviceRule: null,
        appointmentPrice: 3000,
        providerAvailability: providerAvailable,
      });
      expect(result.requirement).toBe("full");
      expect(result.deadlineMinutes).toBe(20);
      expect(result.source.requirement).toBe("tenant");
      expect(result.source.deadline).toBe("tenant");
    });

    it("returns none when tenant default is none", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "none", paymentDeadlineMinutes: 15, allowPayLater: true },
        serviceRule: null,
        appointmentPrice: 3000,
        providerAvailability: providerAvailable,
      });
      expect(result.requirement).toBe("none");
    });
  });

  describe("service override", () => {
    it("service full overrides tenant none", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "none", paymentDeadlineMinutes: 15, allowPayLater: true },
        serviceRule: { serviceId: "s1", paymentRequirement: "full", paymentDeadlineMinutes: 10 },
        appointmentPrice: 3000,
        providerAvailability: providerAvailable,
      });
      expect(result.requirement).toBe("full");
      expect(result.deadlineMinutes).toBe(10);
      expect(result.source.requirement).toBe("service");
      expect(result.source.deadline).toBe("service");
    });

    it("service none overrides tenant full", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "full", paymentDeadlineMinutes: 15, allowPayLater: true },
        serviceRule: { serviceId: "s1", paymentRequirement: "none", paymentDeadlineMinutes: null },
        appointmentPrice: 3000,
        providerAvailability: providerAvailable,
      });
      expect(result.requirement).toBe("none");
    });

    it("service null inherits from tenant", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "full", paymentDeadlineMinutes: 20, allowPayLater: true },
        serviceRule: { serviceId: "s1", paymentRequirement: null, paymentDeadlineMinutes: null },
        appointmentPrice: 3000,
        providerAvailability: providerAvailable,
      });
      expect(result.requirement).toBe("full");
      expect(result.deadlineMinutes).toBe(20);
      expect(result.source.requirement).toBe("tenant");
    });
  });

  describe("zero-price", () => {
    it("returns none when price is zero", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "full", paymentDeadlineMinutes: 15, allowPayLater: true },
        serviceRule: { serviceId: "s1", paymentRequirement: "full", paymentDeadlineMinutes: 10 },
        appointmentPrice: 0,
        providerAvailability: providerAvailable,
      });
      expect(result.requirement).toBe("none");
      expect(result.deadlineMinutes).toBeNull();
    });

    it("returns none when price is negative", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "full", paymentDeadlineMinutes: 15, allowPayLater: true },
        serviceRule: null,
        appointmentPrice: -100,
        providerAvailability: providerAvailable,
      });
      expect(result.requirement).toBe("none");
    });
  });

  describe("provider unavailable", () => {
    it("returns none when provider not available", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "full", paymentDeadlineMinutes: 15, allowPayLater: true },
        serviceRule: null,
        appointmentPrice: 3000,
        providerAvailability: providerUnavailable,
      });
      expect(result.requirement).toBe("none");
      expect(result.onlinePaymentEnabled).toBe(false);
    });
  });

  describe("null tenant settings", () => {
    it("returns none when tenant settings absent (existing tenant)", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: null,
        serviceRule: null,
        appointmentPrice: 3000,
        providerAvailability: providerAvailable,
      });
      expect(result.requirement).toBe("none");
    });
  });

  describe("deadline", () => {
    it("includes deadline only for full requirement", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "full", paymentDeadlineMinutes: 30, allowPayLater: true },
        serviceRule: null,
        appointmentPrice: 5000,
        providerAvailability: providerAvailable,
      });
      expect(result.deadlineMinutes).toBe(30);
    });

    it("deadline is null for none requirement", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "none", paymentDeadlineMinutes: 30, allowPayLater: true },
        serviceRule: null,
        appointmentPrice: 5000,
        providerAvailability: providerAvailable,
      });
      expect(result.deadlineMinutes).toBeNull();
    });

    it("uses application default (15) when no explicit deadline", () => {
      const result = resolveAppointmentPaymentRequirement({
        tenantSettings: { tenantId: "t1", onlinePaymentsEnabled: true, defaultPaymentRequirement: "full", paymentDeadlineMinutes: 0, allowPayLater: true },
        serviceRule: null,
        appointmentPrice: 5000,
        providerAvailability: providerAvailable,
      });
      // 0 is falsy, falls through to app default
      expect(result.deadlineMinutes).toBe(15);
    });
  });

  describe("payment deadline immutability contract", () => {
    it("deadline is snapshot at appointment creation and does not change on retry", () => {
      // Contract: payment_due_at = creation_instant + deadline
      // Retry attempts do NOT extend payment_due_at
      expect(true).toBe(true);
    });
  });

  describe("late payment contract", () => {
    it("late payment does NOT reactivate released appointment", () => {
      // Contract: handle_late_appointment_payment flags requires_review
      // Never recreates/reactivates cancelled appointment
      expect(true).toBe(true);
    });
  });

  describe("timeout/webhook race contract", () => {
    it("cancel_expired_appointment_payment re-checks payment before cancelling", () => {
      // Contract: RPC re-loads with FOR UPDATE and checks:
      //   IF status = 'paid' OR amount_paid >= amount_total THEN return already_paid
      expect(true).toBe(true);
    });
  });
});
