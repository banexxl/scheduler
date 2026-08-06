import type { ResolvedServiceResourceValues } from "../types/service-resource";

/**
 * Base service values needed for resolution.
 */
type BaseServiceValues = {
  durationMinutes: number;
  price: number;
  currency: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

/**
 * Override values from a service-resource assignment.
 * All fields are nullable — null means "use the service default."
 */
type AssignmentOverrides = {
  durationOverrideMinutes: number | null;
  priceOverride: number | null;
  currencyOverride: string | null;
  bufferBeforeOverrideMinutes: number | null;
  bufferAfterOverrideMinutes: number | null;
};

/**
 * Resolves effective values for a service-resource assignment by applying
 * overrides on top of base service defaults.
 *
 * Uses nullish coalescing (??) to preserve valid zero values:
 * - null override → use service default
 * - 0 override → explicit zero (valid for price and buffers)
 *
 * Duration cannot be zero (constraint: 5–1440).
 *
 * Safe for both server and client use (pure function, no side effects).
 */
export function resolveServiceResourceValues(
  service: BaseServiceValues,
  assignment?: AssignmentOverrides | null
): ResolvedServiceResourceValues {
  if (!assignment) {
    return {
      duration: service.durationMinutes,
      price: service.price,
      currency: service.currency,
      bufferBefore: service.bufferBeforeMinutes,
      bufferAfter: service.bufferAfterMinutes,
      overrides: {
        duration: false,
        price: false,
        currency: false,
        bufferBefore: false,
        bufferAfter: false,
      },
    };
  }

  const durationOverridden = assignment.durationOverrideMinutes != null;
  const priceOverridden = assignment.priceOverride != null;
  const currencyOverridden = assignment.currencyOverride != null;
  const bufferBeforeOverridden = assignment.bufferBeforeOverrideMinutes != null;
  const bufferAfterOverridden = assignment.bufferAfterOverrideMinutes != null;

  return {
    duration: assignment.durationOverrideMinutes ?? service.durationMinutes,
    price: assignment.priceOverride ?? service.price,
    currency: assignment.currencyOverride ?? service.currency,
    bufferBefore: assignment.bufferBeforeOverrideMinutes ?? service.bufferBeforeMinutes,
    bufferAfter: assignment.bufferAfterOverrideMinutes ?? service.bufferAfterMinutes,
    overrides: {
      duration: durationOverridden,
      price: priceOverridden,
      currency: currencyOverridden,
      bufferBefore: bufferBeforeOverridden,
      bufferAfter: bufferAfterOverridden,
    },
  };
}
