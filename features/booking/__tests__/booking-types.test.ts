import { describe, it, expect } from "vitest";
import {
  INITIAL_BOOKING_STATE,
  BOOKING_STEPS,
  computeTotalDuration,
  computeTotalPrice,
  type SelectedService,
} from "../types";

/**
 * Booking Types & Compute Tests — Milestone 17.0.
 */

const makeService = (overrides: Partial<SelectedService> = {}): SelectedService => ({
  id: "svc-1",
  name: "Haircut",
  slug: "haircut",
  durationMinutes: 30,
  price: "25.00",
  currency: "USD",
  categoryId: null,
  categoryName: null,
  ...overrides,
});

describe("INITIAL_BOOKING_STATE", () => {
  it("starts with empty services", () => {
    expect(INITIAL_BOOKING_STATE.services).toEqual([]);
  });

  it("starts with null selections", () => {
    expect(INITIAL_BOOKING_STATE.staffId).toBeNull();
    expect(INITIAL_BOOKING_STATE.locationId).toBeNull();
    expect(INITIAL_BOOKING_STATE.date).toBeNull();
    expect(INITIAL_BOOKING_STATE.slot).toBeNull();
    expect(INITIAL_BOOKING_STATE.customer).toBeNull();
  });

  it("starts with empty notes", () => {
    expect(INITIAL_BOOKING_STATE.notes).toBe("");
  });
});

describe("BOOKING_STEPS", () => {
  it("has 6 steps in correct order", () => {
    expect(BOOKING_STEPS).toHaveLength(6);
    expect(BOOKING_STEPS[0]?.key).toBe("services");
    expect(BOOKING_STEPS[1]?.key).toBe("staff");
    expect(BOOKING_STEPS[2]?.key).toBe("location");
    expect(BOOKING_STEPS[3]?.key).toBe("datetime");
    expect(BOOKING_STEPS[4]?.key).toBe("details");
    expect(BOOKING_STEPS[5]?.key).toBe("confirm");
  });

  it("every step has a label", () => {
    for (const step of BOOKING_STEPS) {
      expect(step.label).toBeTruthy();
    }
  });
});

describe("computeTotalDuration", () => {
  it("returns 0 for empty array", () => {
    expect(computeTotalDuration([])).toBe(0);
  });

  it("returns duration for single service", () => {
    expect(computeTotalDuration([makeService()])).toBe(30);
  });

  it("sums durations for multiple services", () => {
    const services = [
      makeService({ durationMinutes: 30 }),
      makeService({ id: "svc-2", durationMinutes: 60 }),
      makeService({ id: "svc-3", durationMinutes: 15 }),
    ];
    expect(computeTotalDuration(services)).toBe(105);
  });
});

describe("computeTotalPrice", () => {
  it("returns 0 for empty array", () => {
    const result = computeTotalPrice([]);
    expect(result.total).toBe(0);
    expect(result.currency).toBe("USD");
  });

  it("returns price for single service", () => {
    const result = computeTotalPrice([makeService({ price: "49.99" })]);
    expect(result.total).toBeCloseTo(49.99);
    expect(result.currency).toBe("USD");
  });

  it("sums prices for multiple services", () => {
    const services = [
      makeService({ price: "25.00" }),
      makeService({ id: "svc-2", price: "30.00" }),
      makeService({ id: "svc-3", price: "15.50" }),
    ];
    const result = computeTotalPrice(services);
    expect(result.total).toBeCloseTo(70.50);
  });

  it("uses currency from first service", () => {
    const services = [
      makeService({ currency: "EUR" }),
      makeService({ id: "svc-2", currency: "USD" }),
    ];
    const result = computeTotalPrice(services);
    expect(result.currency).toBe("EUR");
  });
});
