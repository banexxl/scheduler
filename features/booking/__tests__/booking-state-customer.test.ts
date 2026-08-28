import { describe, it, expect } from "vitest";
import {
  INITIAL_BOOKING_STATE,
  type BookingState,
  type BookingAction,
  type CustomerInfo,
} from "../types";

/**
 * Booking State Customer Tests — Milestone 17.2.
 */

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
    case "SET_CUSTOMER":
      return { ...state, customer: action.customer };
    case "RESET":
      return INITIAL_BOOKING_STATE;
    default:
      return state;
  }
}

const makeCustomer = (): CustomerInfo => ({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "+1234567890",
  notes: "Please call before arrival",
});

describe("CustomerInfo type", () => {
  it("initial state has null customer", () => {
    expect(INITIAL_BOOKING_STATE.customer).toBeNull();
  });
});

describe("SET_CUSTOMER action", () => {
  it("sets customer info", () => {
    const customer = makeCustomer();
    const next = bookingReducer(INITIAL_BOOKING_STATE, { type: "SET_CUSTOMER", customer });
    expect(next.customer).toEqual(customer);
    expect(next.customer?.firstName).toBe("John");
    expect(next.customer?.lastName).toBe("Doe");
    expect(next.customer?.email).toBe("john@example.com");
    expect(next.customer?.phone).toBe("+1234567890");
    expect(next.customer?.notes).toBe("Please call before arrival");
  });

  it("does not reset other state fields", () => {
    const stateWithSlot: BookingState = {
      ...INITIAL_BOOKING_STATE,
      date: "2026-09-01",
      slot: {
        startsAt: "2026-09-01T10:00:00Z",
        endsAt: "2026-09-01T10:30:00Z",
        localStartTime: "10:00",
        localEndTime: "10:30",
        resourceId: "res-1",
        durationMinutes: 30,
      },
    };
    const customer = makeCustomer();
    const next = bookingReducer(stateWithSlot, { type: "SET_CUSTOMER", customer });
    expect(next.customer).toEqual(customer);
    expect(next.date).toBe("2026-09-01");
    expect(next.slot).not.toBeNull();
  });
});

describe("RESET clears customer", () => {
  it("resets customer to null", () => {
    const stateWithCustomer: BookingState = {
      ...INITIAL_BOOKING_STATE,
      customer: makeCustomer(),
    };
    const next = bookingReducer(stateWithCustomer, { type: "RESET" });
    expect(next.customer).toBeNull();
  });
});
