import { describe, it, expect } from "vitest";
import {
  INITIAL_BOOKING_STATE,
  type BookingState,
  type BookingAction,
  type BookingTimeSlot,
  type SelectedService,
} from "../types";

/**
 * Booking State DateTime Tests — Milestone 17.1.
 *
 * Tests the extended BookingState with date/slot fields
 * and cascade reset rules.
 */

// Inline reducer for testing (mirrors BookingProvider)
function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "ADD_SERVICE": {
      if (state.services.some((s) => s.id === action.service.id)) return state;
      return { ...state, services: [...state.services, action.service], staffId: null, date: null, slot: null };
    }
    case "REMOVE_SERVICE": {
      const next = state.services.filter((s) => s.id !== action.serviceId);
      return { ...state, services: next, staffId: next.length === 0 ? null : state.staffId, date: next.length === 0 ? null : state.date, slot: next.length === 0 ? null : state.slot };
    }
    case "SET_SERVICES":
      return { ...state, services: action.services, staffId: null, date: null, slot: null };
    case "SET_STAFF":
      return { ...state, staffId: action.staffId, date: null, slot: null };
    case "SET_LOCATION":
      return { ...state, locationId: action.locationId, date: null, slot: null };
    case "SET_DATE":
      return { ...state, date: action.date, slot: null };
    case "SET_SLOT":
      return { ...state, slot: action.slot };
    case "RESET":
      return INITIAL_BOOKING_STATE;
    default:
      return state;
  }
}

const makeService = (id = "svc-1"): SelectedService => ({
  id, name: "Haircut", slug: "haircut", durationMinutes: 30, price: "25.00", currency: "USD", categoryId: null, categoryName: null,
});

const makeSlot = (): BookingTimeSlot => ({
  startsAt: "2026-09-01T10:00:00Z",
  endsAt: "2026-09-01T10:30:00Z",
  localStartTime: "10:00",
  localEndTime: "10:30",
  resourceId: "res-1",
  durationMinutes: 30,
});

describe("BookingState date/slot fields", () => {
  it("initial state has null date and slot", () => {
    expect(INITIAL_BOOKING_STATE.date).toBeNull();
    expect(INITIAL_BOOKING_STATE.slot).toBeNull();
  });

  it("SET_DATE sets date and clears slot", () => {
    const state = { ...INITIAL_BOOKING_STATE, slot: makeSlot() };
    const next = bookingReducer(state, { type: "SET_DATE", date: "2026-09-01" });
    expect(next.date).toBe("2026-09-01");
    expect(next.slot).toBeNull();
  });

  it("SET_SLOT sets slot", () => {
    const slot = makeSlot();
    const state = { ...INITIAL_BOOKING_STATE, date: "2026-09-01" };
    const next = bookingReducer(state, { type: "SET_SLOT", slot });
    expect(next.slot).toEqual(slot);
  });

  it("SET_DATE to null clears both", () => {
    const state = { ...INITIAL_BOOKING_STATE, date: "2026-09-01", slot: makeSlot() };
    const next = bookingReducer(state, { type: "SET_DATE", date: null });
    expect(next.date).toBeNull();
    expect(next.slot).toBeNull();
  });
});

describe("cascade resets include date/slot", () => {
  const stateWithDateSlot: BookingState = {
    ...INITIAL_BOOKING_STATE,
    services: [makeService()],
    staffId: "staff-1",
    locationId: "loc-1",
    date: "2026-09-01",
    slot: makeSlot(),
  };

  it("ADD_SERVICE resets staff, date, slot", () => {
    const next = bookingReducer(stateWithDateSlot, { type: "ADD_SERVICE", service: makeService("svc-2") });
    expect(next.services).toHaveLength(2);
    expect(next.staffId).toBeNull();
    expect(next.date).toBeNull();
    expect(next.slot).toBeNull();
  });

  it("SET_STAFF resets date and slot", () => {
    const next = bookingReducer(stateWithDateSlot, { type: "SET_STAFF", staffId: "staff-2" });
    expect(next.staffId).toBe("staff-2");
    expect(next.date).toBeNull();
    expect(next.slot).toBeNull();
  });

  it("SET_LOCATION resets date and slot", () => {
    const next = bookingReducer(stateWithDateSlot, { type: "SET_LOCATION", locationId: "loc-2" });
    expect(next.locationId).toBe("loc-2");
    expect(next.date).toBeNull();
    expect(next.slot).toBeNull();
  });

  it("RESET clears everything", () => {
    const next = bookingReducer(stateWithDateSlot, { type: "RESET" });
    expect(next).toEqual(INITIAL_BOOKING_STATE);
  });
});
