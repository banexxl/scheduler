"use client";

/**
 * useBooking Hook — Milestone 17.0.
 *
 * Convenience hook for accessing booking state and dispatch.
 * Provides typed helper methods for common operations.
 */

import { useContext, useCallback, useMemo } from "react";
import { BookingContext } from "../context/BookingProvider";
import {
  computeTotalDuration,
  computeTotalPrice,
  type SelectedService,
} from "../types";

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error(
      "useBooking must be used within <BookingProvider>. " +
        "Ensure BookingProvider wraps the booking pages."
    );
  }

  const { state, dispatch } = ctx;

  const addService = useCallback(
    (service: SelectedService) => dispatch({ type: "ADD_SERVICE", service }),
    [dispatch]
  );

  const removeService = useCallback(
    (serviceId: string) => dispatch({ type: "REMOVE_SERVICE", serviceId }),
    [dispatch]
  );

  const toggleService = useCallback(
    (service: SelectedService) => {
      const exists = state.services.some((s) => s.id === service.id);
      if (exists) {
        dispatch({ type: "REMOVE_SERVICE", serviceId: service.id });
      } else {
        dispatch({ type: "ADD_SERVICE", service });
      }
    },
    [state.services, dispatch]
  );

  const isServiceSelected = useCallback(
    (serviceId: string) => state.services.some((s) => s.id === serviceId),
    [state.services]
  );

  const setStaff = useCallback(
    (staffId: string | null) => dispatch({ type: "SET_STAFF", staffId }),
    [dispatch]
  );

  const setLocation = useCallback(
    (locationId: string | null) => dispatch({ type: "SET_LOCATION", locationId }),
    [dispatch]
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), [dispatch]);

  const totalDuration = useMemo(
    () => computeTotalDuration(state.services),
    [state.services]
  );

  const totalPrice = useMemo(
    () => computeTotalPrice(state.services),
    [state.services]
  );

  return {
    state,
    dispatch,
    // Helpers
    addService,
    removeService,
    toggleService,
    isServiceSelected,
    setStaff,
    setLocation,
    reset,
    // Computed
    totalDuration,
    totalPrice,
    hasServices: state.services.length > 0,
    serviceCount: state.services.length,
  };
}
