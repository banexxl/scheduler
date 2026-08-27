"use client";

/**
 * Booking Provider — Milestone 17.0.
 *
 * React Context + useReducer for shared booking state
 * across all booking pages (/services, /staff, /locations).
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
      // Don't add duplicates
      if (state.services.some((s) => s.id === action.service.id)) return state;
      return {
        ...state,
        services: [...state.services, action.service],
        // Reset downstream selections when services change
        staffId: null,
      };
    }
    case "REMOVE_SERVICE": {
      const next = state.services.filter((s) => s.id !== action.serviceId);
      return {
        ...state,
        services: next,
        // Reset downstream if all services removed
        staffId: next.length === 0 ? null : state.staffId,
      };
    }
    case "SET_SERVICES":
      return { ...state, services: action.services, staffId: null };
    case "SET_STAFF":
      return { ...state, staffId: action.staffId };
    case "SET_LOCATION":
      return { ...state, locationId: action.locationId };
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
