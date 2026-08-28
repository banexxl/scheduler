"use client";

/**
 * Booking Provider — Milestones 17.0 + 17.1.
 *
 * React Context + useReducer for shared booking state
 * across all booking pages (/services, /staff, /locations, /date-time).
 *
 * Cascade rules:
 * - Changing services → resets staff, date, slot
 * - Changing staff → resets date, slot
 * - Changing location → resets date, slot
 * - Changing date → resets slot
 *
 * Session-only — no persistence, no localStorage, no URL params.
 */

import {
  createContext,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";
import {
  INITIAL_BOOKING_STATE,
  type BookingState,
  type BookingAction,
} from "../types";

// ─── Reducer ─────────────────────────────────────────────────────────────────

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "ADD_SERVICE": {
      if (state.services.some((s) => s.id === action.service.id)) return state;
      return {
        ...state,
        services: [...state.services, action.service],
        staffId: null,
        date: null,
        slot: null,
      };
    }
    case "REMOVE_SERVICE": {
      const next = state.services.filter((s) => s.id !== action.serviceId);
      return {
        ...state,
        services: next,
        staffId: next.length === 0 ? null : state.staffId,
        date: next.length === 0 ? null : state.date,
        slot: next.length === 0 ? null : state.slot,
      };
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

// ─── Context ─────────────────────────────────────────────────────────────────

export type BookingContextValue = {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
};

export const BookingContext = createContext<BookingContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

type Props = {
  children: ReactNode;
};

export default function BookingProvider({ children }: Props) {
  const [state, dispatch] = useReducer(bookingReducer, INITIAL_BOOKING_STATE);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}
