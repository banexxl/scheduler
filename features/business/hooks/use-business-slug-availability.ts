"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export type SlugAvailabilityStatus =
  | "idle"
  | "invalid"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

export type SlugAvailabilityState = {
  status: SlugAvailabilityStatus;
  available: boolean | null;
  message: string;
  /** The slug that this result corresponds to */
  confirmedSlug: string | null;
};

type UseBusinessSlugAvailabilityOptions = {
  /** Current slug value */
  slug: string;
  /** Whether local Yup validation passes for this slug */
  isLocallyValid: boolean;
  /** Whether the slug is reserved (from local check) */
  isReserved: boolean;
};

/** Internal state from the async check only */
type AsyncCheckState = {
  status: "checking" | "available" | "unavailable" | "error";
  available: boolean | null;
  message: string;
  confirmedSlug: string | null;
  /** The slug this result belongs to */
  forSlug: string;
};

const DEBOUNCE_MS = 400;

/**
 * Client hook for live business slug availability checking.
 *
 * Features:
 * - Debounces requests (~400ms)
 * - Cancels stale requests via AbortController
 * - Does not request for locally invalid or reserved slugs
 * - Resets state when slug changes
 * - Handles unmount safely
 * - Avoids duplicate requests for unchanged slugs
 */
export function useBusinessSlugAvailability({
  slug,
  isLocallyValid,
  isReserved,
}: UseBusinessSlugAvailabilityOptions): SlugAvailabilityState & {
  retry: () => void;
} {
  // Only stores results from async operations (never set synchronously in effects)
  const [asyncState, setAsyncState] = useState<AsyncCheckState | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedSlug = useRef<string>("");

  const checkAvailability = useCallback(
    async (slugToCheck: string) => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setAsyncState({
        status: "checking",
        available: null,
        message: "Checking availability\u2026",
        confirmedSlug: null,
        forSlug: slugToCheck,
      });

      try {
        const response = await fetch(
          `/api/businesses/slug-availability?slug=${encodeURIComponent(slugToCheck)}`,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setAsyncState({
            status: "error",
            available: null,
            message: "Authentication required. Please sign in again.",
            confirmedSlug: null,
            forSlug: slugToCheck,
          });
          return;
        }

        if (!response.ok && response.status !== 200) {
          setAsyncState({
            status: "error",
            available: null,
            message: "Availability could not be checked. Try again.",
            confirmedSlug: null,
            forSlug: slugToCheck,
          });
          return;
        }

        const data = (await response.json()) as {
          status: string;
          available: boolean;
        };

        if (controller.signal.aborted) return;

        switch (data.status) {
          case "available":
            lastCheckedSlug.current = slugToCheck;
            setAsyncState({
              status: "available",
              available: true,
              message: "This address is available.",
              confirmedSlug: slugToCheck,
              forSlug: slugToCheck,
            });
            break;
          case "unavailable":
            lastCheckedSlug.current = slugToCheck;
            setAsyncState({
              status: "unavailable",
              available: false,
              message: "This address is already in use.",
              confirmedSlug: null,
              forSlug: slugToCheck,
            });
            break;
          case "invalid":
            setAsyncState({
              status: "error",
              available: false,
              message: "",
              confirmedSlug: null,
              forSlug: slugToCheck,
            });
            break;
          default:
            setAsyncState({
              status: "error",
              available: null,
              message: "Availability could not be checked. Try again.",
              confirmedSlug: null,
              forSlug: slugToCheck,
            });
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setAsyncState({
          status: "error",
          available: null,
          message: "Availability could not be checked. Try again.",
          confirmedSlug: null,
          forSlug: slugToCheck,
        });
      }
    },
    []
  );

  // Effect: debounce and trigger availability check (no synchronous setState)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Only trigger async check when slug is non-empty, locally valid, and not reserved
    if (!slug || !isLocallyValid || isReserved) {
      return;
    }

    // Skip if we already have a confirmed result for this exact slug
    if (slug === lastCheckedSlug.current && asyncState?.confirmedSlug === slug) {
      return;
    }

    // Debounce the check — the "checking" state is set inside checkAvailability
    debounceTimerRef.current = setTimeout(() => {
      void checkAvailability(slug);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isLocallyValid, isReserved, checkAvailability]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const retry = useCallback(() => {
    if (slug && isLocallyValid && !isReserved) {
      lastCheckedSlug.current = "";
      void checkAvailability(slug);
    }
  }, [slug, isLocallyValid, isReserved, checkAvailability]);

  // Derive final state from inputs + async result (no setState in render)
  const derivedState: SlugAvailabilityState = useMemo(() => {
    // Empty slug = idle
    if (!slug) {
      return { status: "idle", available: null, message: "", confirmedSlug: null };
    }

    // Locally invalid or reserved = invalid (Yup shows the error message)
    if (!isLocallyValid || isReserved) {
      return { status: "invalid", available: false, message: "", confirmedSlug: null };
    }

    // If we have an async result for this exact slug, use it
    if (asyncState && asyncState.forSlug === slug) {
      return {
        status: asyncState.status,
        available: asyncState.available,
        message: asyncState.message,
        confirmedSlug: asyncState.confirmedSlug,
      };
    }

    // Slug changed since last check — show checking (debounce pending)
    return {
      status: "checking",
      available: null,
      message: "Checking availability\u2026",
      confirmedSlug: null,
    };
  }, [slug, isLocallyValid, isReserved, asyncState]);

  return { ...derivedState, retry };
}
