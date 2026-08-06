import { describe, it, expect } from "vitest";
import {
  publicAvailabilityRequestSchema,
  publicBookingSubmissionSchema,
} from "../schemas/public-booking-schemas";

// ─── Public Availability Request Schema ──────────────────────────────────────

describe("publicAvailabilityRequestSchema", () => {
  const validInput = {
    serviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    locationId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    localDate: "2026-09-15",
  };

  it("accepts valid input", async () => {
    const result = await publicAvailabilityRequestSchema.validate(validInput);
    expect(result.serviceId).toBe(validInput.serviceId);
    expect(result.locationId).toBe(validInput.locationId);
    expect(result.localDate).toBe(validInput.localDate);
  });

  it("accepts valid input with resource", async () => {
    const result = await publicAvailabilityRequestSchema.validate({
      ...validInput,
      resourceId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    });
    expect(result.resourceId).toBe("c3d4e5f6-a7b8-9012-cdef-123456789012");
  });

  it("accepts null resourceId", async () => {
    const result = await publicAvailabilityRequestSchema.validate({
      ...validInput,
      resourceId: null,
    });
    expect(result.resourceId).toBeNull();
  });

  it("normalizes empty resourceId to null", async () => {
    const result = await publicAvailabilityRequestSchema.validate({
      ...validInput,
      resourceId: "",
    });
    expect(result.resourceId).toBeNull();
  });

  it("rejects missing serviceId", async () => {
    await expect(
      publicAvailabilityRequestSchema.validate({ ...validInput, serviceId: "" })
    ).rejects.toThrow();
  });

  it("rejects invalid UUID", async () => {
    await expect(
      publicAvailabilityRequestSchema.validate({ ...validInput, serviceId: "not-a-uuid" })
    ).rejects.toThrow();
  });

  it("rejects invalid date format", async () => {
    await expect(
      publicAvailabilityRequestSchema.validate({ ...validInput, localDate: "15-09-2026" })
    ).rejects.toThrow();
  });

  it("rejects impossible date", async () => {
    await expect(
      publicAvailabilityRequestSchema.validate({ ...validInput, localDate: "2026-02-30" })
    ).rejects.toThrow();
  });
});

// ─── Public Booking Submission Schema ────────────────────────────────────────

describe("publicBookingSubmissionSchema", () => {
  const validSubmission = {
    serviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    locationId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    resourceId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    startsAt: "2026-09-15T10:00:00.000Z",
    localDate: "2026-09-15",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    customerPhone: "+1234567890",
    customerNotes: "First visit",
    idempotencyKey: "d4e5f6a7-b8c9-0123-def0-1234567890ab",
  };

  it("accepts valid full submission", async () => {
    const result = await publicBookingSubmissionSchema.validate(validSubmission);
    expect(result.serviceId).toBe(validSubmission.serviceId);
    expect(result.customerName).toBe("Jane Doe");
    expect(result.idempotencyKey).toBe(validSubmission.idempotencyKey);
  });

  it("accepts minimal submission (no optional fields)", async () => {
    const result = await publicBookingSubmissionSchema.validate({
      ...validSubmission,
      customerEmail: "",
      customerPhone: "",
      customerNotes: "",
    });
    expect(result.customerEmail).toBeNull();
    expect(result.customerPhone).toBeNull();
    expect(result.customerNotes).toBeNull();
  });

  it("rejects missing customer name", async () => {
    await expect(
      publicBookingSubmissionSchema.validate({ ...validSubmission, customerName: "" })
    ).rejects.toThrow();
  });

  it("rejects customer name over 160 chars", async () => {
    await expect(
      publicBookingSubmissionSchema.validate({ ...validSubmission, customerName: "A".repeat(161) })
    ).rejects.toThrow();
  });

  it("rejects invalid email format", async () => {
    await expect(
      publicBookingSubmissionSchema.validate({ ...validSubmission, customerEmail: "not-email" })
    ).rejects.toThrow();
  });

  it("rejects phone shorter than 3 chars", async () => {
    await expect(
      publicBookingSubmissionSchema.validate({ ...validSubmission, customerPhone: "12" })
    ).rejects.toThrow();
  });

  it("rejects phone longer than 30 chars", async () => {
    await expect(
      publicBookingSubmissionSchema.validate({ ...validSubmission, customerPhone: "1".repeat(31) })
    ).rejects.toThrow();
  });

  it("rejects notes longer than 2000 chars", async () => {
    await expect(
      publicBookingSubmissionSchema.validate({ ...validSubmission, customerNotes: "X".repeat(2001) })
    ).rejects.toThrow();
  });

  it("rejects missing idempotency key", async () => {
    await expect(
      publicBookingSubmissionSchema.validate({ ...validSubmission, idempotencyKey: "" })
    ).rejects.toThrow();
  });

  it("rejects invalid idempotency key format", async () => {
    await expect(
      publicBookingSubmissionSchema.validate({ ...validSubmission, idempotencyKey: "not-uuid" })
    ).rejects.toThrow();
  });

  it("rejects invalid startsAt format", async () => {
    await expect(
      publicBookingSubmissionSchema.validate({ ...validSubmission, startsAt: "2026-09-15 10:00" })
    ).rejects.toThrow();
  });

  it("accepts startsAt with milliseconds", async () => {
    const result = await publicBookingSubmissionSchema.validate({
      ...validSubmission,
      startsAt: "2026-09-15T10:00:00.000Z",
    });
    expect(result.startsAt).toBe("2026-09-15T10:00:00.000Z");
  });

  it("trims customer name whitespace", async () => {
    const result = await publicBookingSubmissionSchema.validate({
      ...validSubmission,
      customerName: "  Jane Doe  ",
    });
    expect(result.customerName).toBe("Jane Doe");
  });

  it("accepts optional reviewed price", async () => {
    const result = await publicBookingSubmissionSchema.validate({
      ...validSubmission,
      reviewedPrice: "25.00",
      reviewedDuration: 30,
    });
    expect(result.reviewedPrice).toBe("25.00");
    expect(result.reviewedDuration).toBe(30);
  });
});
