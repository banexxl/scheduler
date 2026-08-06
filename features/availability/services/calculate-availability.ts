import "server-only";

/**
 * Availability Calculation Engine — Milestone 6.7
 *
 * Orchestrates the full availability calculation pipeline:
 * 1. Validate request
 * 2. Load and verify tenant, service, location, assignments
 * 3. Discover eligible resources
 * 4. Resolve location operating periods
 * 5. Resolve resource working periods per resource
 * 6. Intersect location and resource periods
 * 7. Convert local periods to exact instants
 * 8. Subtract resource time-off
 * 9. Resolve service values (duration, buffers, price)
 * 10. Generate candidate slots
 * 11. Return grouped results with reason codes
 *
 * This service is read-only — it performs NO mutations.
 * Pure interval math is delegated to separate utility modules.
 *
 * DST Policy:
 * - Nonexistent local times (spring-forward): Slots starting in nonexistent
 *   times are skipped because TZDate advances them, creating misalignment.
 * - Ambiguous local times (fall-back): The earlier occurrence is used
 *   (date-fns-tz default behavior with TZDate).
 */

import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";

import type { TimePeriod } from "@/lib/scheduling/scheduling-constants";
import { getIsoDayOfWeek } from "@/lib/scheduling/scheduling-constants";
import { intersectTimePeriods, normalizeTimePeriods } from "@/lib/scheduling/local-time-periods";
import type { InstantRange } from "@/lib/scheduling/instant-ranges";
import { subtractInstantRanges } from "@/lib/scheduling/instant-ranges";
import { generateCandidateSlots } from "@/lib/scheduling/slot-generation";
import { resolveServiceResourceValues } from "@/features/services/utils/resolve-service-resource-values";
import { getResolvedBookingRules } from "@/features/booking-rules/services/get-booking-rules";
import { filterSlotsByBookingRules } from "@/features/booking-rules/utils/filter-slots-by-booking-rules";
import type { ResolvedBookingRules } from "@/features/booking-rules/types/booking-rules";

import type {
  AvailabilityRequest,
  AvailabilityResult,
  AvailabilitySlot,
  AvailabilityReasonCode,
  ResourceAvailabilityResult,
} from "../types/availability";
import {
  SLOT_INTERVAL_DEFAULT,
  MAX_ELIGIBLE_RESOURCES,
  MAX_SLOTS_PER_RESOURCE,
} from "../types/availability";

import {
  loadTenantTimezone,
  loadServiceForAvailability,
  loadLocationForAvailability,
  loadServiceLocationAssignment,
  loadServiceResourceAssignments,
  loadResourcesForAvailability,
  loadResourceLocationAssignments,
  loadLocationBusinessHours,
  loadLocationException,
  loadResourceWorkingHours,
  loadResourceTimeOff,
  type ServiceResourceForAvailability,
  type ResourceForAvailability,
  type ServiceForAvailability,
  type ResourceWorkingHourRow,
  type ResourceTimeOffRow,
} from "./availability-queries";

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Calculate candidate availability slots for a service at a location on a given date.
 *
 * @param request - Validated availability request
 * @param now - Current instant for past-time filtering (defaults to new Date())
 * @returns Grouped availability result per resource
 */
export async function calculateAvailability(
  request: AvailabilityRequest,
  now: Date = new Date()
): Promise<AvailabilityResult> {
  const {
    tenantId,
    serviceId,
    locationId,
    resourceId,
    localDate,
    slotIntervalMinutes: requestSlotInterval,
  } = request;

  // ─── Step 1: Load tenant timezone ──────────────────────────────────────────
  const tenant = await loadTenantTimezone(tenantId);
  if (!tenant) {
    return emptyResult(request, "UTC", "SERVICE_INACTIVE");
  }
  const timeZone = tenant.defaultTimezone;

  // ─── Step 2: Past-date check ───────────────────────────────────────────────
  const todayInTz = format(toZonedTime(now, timeZone), "yyyy-MM-dd");
  if (localDate < todayInTz) {
    return emptyResult(request, timeZone, "DATE_IN_PAST");
  }

  // ─── Step 3: Load and verify service ───────────────────────────────────────
  const service = await loadServiceForAvailability(tenantId, serviceId);
  if (!service) {
    return emptyResult(request, timeZone, "SERVICE_INACTIVE");
  }
  if (!service.isActive) {
    return emptyResult(request, timeZone, "SERVICE_INACTIVE");
  }

  // ─── Step 4: Load and verify location ──────────────────────────────────────
  const location = await loadLocationForAvailability(tenantId, locationId);
  if (!location) {
    return emptyResult(request, timeZone, "LOCATION_INACTIVE");
  }
  if (!location.isActive) {
    return emptyResult(request, timeZone, "LOCATION_INACTIVE");
  }

  // ─── Step 5: Verify service-location assignment ────────────────────────────
  const serviceLocation = await loadServiceLocationAssignment(tenantId, serviceId, locationId);
  if (!serviceLocation || !serviceLocation.isActive) {
    return emptyResult(request, timeZone, "SERVICE_NOT_AT_LOCATION");
  }

  // ─── Step 6: Resolve booking rules ──────────────────────────────────────────
  let resolvedBookingRules: ResolvedBookingRules | null = null;
  let effectiveSlotInterval = requestSlotInterval ?? SLOT_INTERVAL_DEFAULT;
  let slotIntervalSource: "tenant" | "service" | "default" | "request_override" = "default";

  try {
    resolvedBookingRules = await getResolvedBookingRules(tenantId, serviceId);
    // Use resolved slot interval unless request provides an explicit override
    if (requestSlotInterval !== undefined && requestSlotInterval !== null) {
      slotIntervalSource = "request_override";
      effectiveSlotInterval = requestSlotInterval;
    } else {
      effectiveSlotInterval = resolvedBookingRules.slotIntervalMinutes;
      slotIntervalSource = resolvedBookingRules.sources.slotInterval === "service"
        ? "service"
        : resolvedBookingRules.sources.slotInterval === "tenant"
          ? "tenant"
          : "default";
    }
  } catch {
    // If booking rules cannot be loaded, continue with defaults
    // This ensures older tenants without booking-rule rows don't fail
  }

  const slotIntervalMinutes = effectiveSlotInterval;

  // ─── Step 7: Resolve location operating periods ────────────────────────────
  const locationPeriods = await resolveLocationPeriods(tenantId, locationId, localDate, timeZone);
  if (locationPeriods.periods.length === 0) {
    return emptyResult(request, timeZone, "LOCATION_CLOSED");
  }

  // ─── Step 8: Discover eligible resources ───────────────────────────────────
  const eligibleResources = await discoverEligibleResources(
    tenantId,
    serviceId,
    locationId,
    resourceId ?? null
  );

  if (eligibleResources.length === 0) {
    const reasonCode: AvailabilityReasonCode = resourceId
      ? "RESOURCE_NOT_AT_LOCATION"
      : "NO_ELIGIBLE_RESOURCES";
    return emptyResult(request, timeZone, reasonCode);
  }

  // ─── Step 9: Load resource schedules and time-off in bulk ──────────────────
  const eligibleResourceIds = eligibleResources.map((r) => r.resource.id);

  // Day boundary instants for time-off overlap query
  const dayStartDate = fromZonedTime(new Date(`${localDate}T00:00:00`), timeZone);
  // dayEnd = start of next day in tenant TZ
  const nextDay = new Date(dayStartDate.getTime() + 24 * 60 * 60_000);
  const dayStartInstant = dayStartDate.toISOString();
  const dayEndInstant = nextDay.toISOString();

  const [allWorkingHours, allTimeOff] = await Promise.all([
    loadResourceWorkingHours(tenantId, eligibleResourceIds),
    loadResourceTimeOff(tenantId, eligibleResourceIds, dayStartInstant, dayEndInstant),
  ]);

  // ─── Step 10: Calculate per resource ────────────────────────────────────────
  const isoWeekday = getIsoDayOfWeek(toZonedTime(dayStartDate, timeZone));

  const resourceResults: ResourceAvailabilityResult[] = [];

  for (const { resource, assignment } of eligibleResources.slice(0, MAX_ELIGIBLE_RESOURCES)) {
    const result = calculateForResource({
      resource,
      assignment,
      service,
      locationPeriods: locationPeriods.periods,
      locationPeriodsSource: locationPeriods.source,
      allWorkingHours,
      allTimeOff,
      isoWeekday,
      localDate,
      locationId,
      timeZone,
      slotIntervalMinutes,
      now,
      dayStartInstant,
      dayEndInstant,
    });

    resourceResults.push(result);
  }

  // ─── Step 11: Apply booking rule filtering ─────────────────────────────────
  const totalRemovedCounts = { past: 0, sameDayDisabled: 0, minimumNotice: 0, maximumAdvance: 0 };

  if (resolvedBookingRules) {
    for (const resourceResult of resourceResults) {
      if (resourceResult.slots.length === 0) continue;

      const filterResult = filterSlotsByBookingRules({
        slots: resourceResult.slots,
        rules: resolvedBookingRules,
        now,
        tenantTimeZone: timeZone,
        requestedLocalDate: localDate,
      });

      resourceResult.slots = filterResult.slots;
      totalRemovedCounts.past += filterResult.removedCounts.past;
      totalRemovedCounts.sameDayDisabled += filterResult.removedCounts.sameDayDisabled;
      totalRemovedCounts.minimumNotice += filterResult.removedCounts.minimumNotice;
      totalRemovedCounts.maximumAdvance += filterResult.removedCounts.maximumAdvance;

      // Update reason code if all slots were removed by booking rules
      if (resourceResult.slots.length === 0 && filterResult.reasonCode) {
        resourceResult.reasonCode = filterResult.reasonCode;
      }
    }
  }

  const totalSlots = resourceResults.reduce((sum, r) => sum + r.slots.length, 0);

  // Determine top-level reason code
  let topReasonCode: AvailabilityReasonCode | undefined;
  if (totalSlots === 0) {
    // Check if booking rules removed everything
    const totalRemoved = totalRemovedCounts.sameDayDisabled + totalRemovedCounts.minimumNotice + totalRemovedCounts.maximumAdvance;
    if (totalRemovedCounts.maximumAdvance > 0) {
      topReasonCode = "MAXIMUM_ADVANCE_EXCEEDED";
    } else if (totalRemovedCounts.sameDayDisabled > 0) {
      topReasonCode = "SAME_DAY_BOOKING_DISABLED";
    } else if (totalRemovedCounts.minimumNotice > 0 && totalRemoved > 0) {
      topReasonCode = "MINIMUM_NOTICE_NOT_MET";
    } else {
      topReasonCode = "NO_SLOTS";
    }
  }

  return {
    tenantId,
    serviceId,
    locationId,
    localDate,
    timeZone,
    resources: resourceResults,
    totalSlots,
    reasonCode: topReasonCode,
    bookingRules: resolvedBookingRules ? {
      effectiveSlotInterval: slotIntervalMinutes,
      slotIntervalSource,
      minimumNoticeMinutes: resolvedBookingRules.minimumNoticeMinutes,
      maximumAdvanceDays: resolvedBookingRules.maximumAdvanceDays,
      allowSameDayBooking: resolvedBookingRules.allowSameDayBooking,
      removedByRules: totalRemovedCounts,
    } : undefined,
  };
}

// ─── Location Period Resolution ──────────────────────────────────────────────

type ResolvedPeriods = {
  periods: TimePeriod[];
  source: "weekly" | "custom_exception";
};

async function resolveLocationPeriods(
  tenantId: string,
  locationId: string,
  localDate: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _timeZone: string
): Promise<ResolvedPeriods> {
  const [businessHours, exceptionData] = await Promise.all([
    loadLocationBusinessHours(tenantId, locationId),
    loadLocationException(tenantId, locationId, localDate),
  ]);

  // Exception replaces weekly hours
  if (exceptionData) {
    const { exception, periods } = exceptionData;

    if (exception.exceptionType === "closed") {
      return { periods: [], source: "weekly" };
    }

    if (exception.exceptionType === "custom_hours") {
      return {
        periods: periods.map((p) => ({
          startTime: p.startTime,
          endTime: p.endTime,
        })),
        source: "custom_exception",
      };
    }
  }

  // No exception: use weekly hours for the weekday
  // Compute ISO weekday from the local date in the tenant timezone
  const dateParts = localDate.split("-").map(Number);
  const localDateObj = new Date(dateParts[0]!, dateParts[1]! - 1, dateParts[2]!);
  const isoWeekday = getIsoDayOfWeek(localDateObj);

  const weekdayHours = businessHours
    .filter((h) => h.dayOfWeek === isoWeekday && h.isActive)
    .map((h) => ({ startTime: h.startTime, endTime: h.endTime }));

  return {
    periods: normalizeTimePeriods(weekdayHours),
    source: "weekly",
  };
}

// ─── Resource Discovery ──────────────────────────────────────────────────────

type EligibleResource = {
  resource: ResourceForAvailability;
  assignment: ServiceResourceForAvailability;
};

async function discoverEligibleResources(
  tenantId: string,
  serviceId: string,
  locationId: string,
  resourceId: string | null
): Promise<EligibleResource[]> {
  // Load active service-resource assignments
  const assignments = await loadServiceResourceAssignments(tenantId, serviceId, resourceId);
  if (assignments.length === 0) return [];

  const resourceIds = assignments.map((a) => a.resourceId);

  // Bulk load resources and resource-location assignments
  const [resources, resourceLocations] = await Promise.all([
    loadResourcesForAvailability(tenantId, resourceIds),
    loadResourceLocationAssignments(tenantId, locationId, resourceIds),
  ]);

  // Build lookup maps
  const resourceMap = new Map(resources.map((r) => [r.id, r]));
  const resourceLocationSet = new Set(
    resourceLocations
      .filter((rl) => rl.isActive)
      .map((rl) => rl.resourceId)
  );

  // Filter to eligible resources:
  // - Resource exists and is active
  // - Resource has active resource-location assignment for this location
  const eligible: EligibleResource[] = [];

  for (const assignment of assignments) {
    const resource = resourceMap.get(assignment.resourceId);
    if (!resource) continue;
    if (!resource.isActive) continue;
    if (!resourceLocationSet.has(resource.id)) continue;

    eligible.push({ resource, assignment });
  }

  return eligible;
}

// ─── Per-Resource Calculation ────────────────────────────────────────────────

type ResourceCalcInput = {
  resource: ResourceForAvailability;
  assignment: ServiceResourceForAvailability;
  service: ServiceForAvailability;
  locationPeriods: TimePeriod[];
  locationPeriodsSource: "weekly" | "custom_exception";
  allWorkingHours: ResourceWorkingHourRow[];
  allTimeOff: ResourceTimeOffRow[];
  isoWeekday: number;
  localDate: string;
  locationId: string;
  timeZone: string;
  slotIntervalMinutes: number;
  now: Date;
  dayStartInstant: string;
  dayEndInstant: string;
};

function calculateForResource(input: ResourceCalcInput): ResourceAvailabilityResult {
  const {
    resource,
    assignment,
    service,
    locationPeriods,
    locationPeriodsSource,
    allWorkingHours,
    allTimeOff,
    isoWeekday,
    localDate,
    locationId,
    timeZone,
    slotIntervalMinutes,
    now,
  } = input;

  // ─── Resolve resource working periods for this day and location ────────────
  const resourcePeriods = resolveResourceWorkingPeriods(
    resource.id,
    locationId,
    isoWeekday,
    allWorkingHours
  );

  if (resourcePeriods.length === 0) {
    return {
      resourceId: resource.id,
      resourceName: resource.name,
      slots: [],
      reasonCode: "NO_RESOURCE_WORKING_HOURS",
    };
  }

  // ─── Intersect location and resource periods ───────────────────────────────
  const intersected = intersectTimePeriods(locationPeriods, resourcePeriods);

  if (intersected.length === 0) {
    return {
      resourceId: resource.id,
      resourceName: resource.name,
      slots: [],
      reasonCode: "PERIOD_TOO_SHORT",
    };
  }

  // ─── Convert local periods to instant ranges ──────────────────────────────
  const availableRanges = localPeriodsToInstantRanges(intersected, localDate, timeZone);

  if (availableRanges.length === 0) {
    return {
      resourceId: resource.id,
      resourceName: resource.name,
      slots: [],
      reasonCode: "PERIOD_TOO_SHORT",
    };
  }

  // ─── Subtract time-off ─────────────────────────────────────────────────────
  const timeOffBlocks = getResourceTimeOffBlocks(resource.id, locationId, allTimeOff);
  const rangesAfterTimeOff = subtractInstantRanges(availableRanges, timeOffBlocks);

  if (rangesAfterTimeOff.length === 0) {
    return {
      resourceId: resource.id,
      resourceName: resource.name,
      slots: [],
      reasonCode: "FULLY_BLOCKED_BY_TIME_OFF",
    };
  }

  // ─── Resolve service values ────────────────────────────────────────────────
  const resolved = resolveServiceResourceValues(
    {
      durationMinutes: service.durationMinutes,
      price: service.price,
      currency: service.currency,
      bufferBeforeMinutes: service.bufferBeforeMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
    },
    {
      durationOverrideMinutes: assignment.durationOverrideMinutes,
      priceOverride: assignment.priceOverride,
      currencyOverride: assignment.currencyOverride,
      bufferBeforeOverrideMinutes: assignment.bufferBeforeOverrideMinutes,
      bufferAfterOverrideMinutes: assignment.bufferAfterOverrideMinutes,
    }
  );

  // Determine service values source
  const hasAnyOverride =
    resolved.overrides.duration ||
    resolved.overrides.price ||
    resolved.overrides.currency ||
    resolved.overrides.bufferBefore ||
    resolved.overrides.bufferAfter;

  const allOverridden =
    resolved.overrides.duration &&
    resolved.overrides.price &&
    resolved.overrides.bufferBefore &&
    resolved.overrides.bufferAfter;

  const serviceValuesSource: "base" | "resource_override" | "mixed" = allOverridden
    ? "resource_override"
    : hasAnyOverride
      ? "mixed"
      : "base";

  // ─── Generate candidate slots ─────────────────────────────────────────────
  const candidateSlots = generateCandidateSlots({
    availableRanges: rangesAfterTimeOff,
    durationMinutes: resolved.duration,
    bufferBeforeMinutes: resolved.bufferBefore,
    bufferAfterMinutes: resolved.bufferAfter,
    intervalMinutes: slotIntervalMinutes,
    timeZone,
    localDate,
    now,
  });

  // ─── Map to AvailabilitySlot ───────────────────────────────────────────────
  const slots: AvailabilitySlot[] = candidateSlots
    .slice(0, MAX_SLOTS_PER_RESOURCE)
    .map((slot) => ({
      resourceId: resource.id,
      serviceId: service.id,
      locationId,
      localDate,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      localStartTime: slot.localStartTime,
      localEndTime: slot.localEndTime,
      durationMinutes: resolved.duration,
      bufferBeforeMinutes: resolved.bufferBefore,
      bufferAfterMinutes: resolved.bufferAfter,
      occupiedWindowStartsAt: slot.occupiedWindowStartsAt,
      occupiedWindowEndsAt: slot.occupiedWindowEndsAt,
      price: String(resolved.price),
      currency: resolved.currency,
      source: {
        locationHours: locationPeriodsSource,
        resourceHours: "weekly" as const,
        serviceValues: serviceValuesSource,
      },
    }));

  return {
    resourceId: resource.id,
    resourceName: resource.name,
    slots,
    reasonCode: slots.length === 0 ? "PERIOD_TOO_SHORT" : undefined,
  };
}

// ─── Resource Working Period Resolution ──────────────────────────────────────

/**
 * Resolves effective resource working periods for a given day and location.
 *
 * Semantics:
 * - Location-specific periods (location_id = requested location) always apply.
 * - General periods (location_id = NULL) apply as well when the resource
 *   has a resource-location assignment (already verified by eligibility check).
 * - Both types are combined and normalized (no duplicates).
 */
function resolveResourceWorkingPeriods(
  resourceId: string,
  locationId: string,
  isoWeekday: number,
  allWorkingHours: ResourceWorkingHourRow[]
): TimePeriod[] {
  const resourceHours = allWorkingHours.filter(
    (h) => h.resourceId === resourceId && h.dayOfWeek === isoWeekday
  );

  // Include location-specific hours AND general (null-location) hours
  const applicable = resourceHours.filter(
    (h) => h.locationId === locationId || h.locationId === null
  );

  const periods: TimePeriod[] = applicable.map((h) => ({
    startTime: h.startTime,
    endTime: h.endTime,
  }));

  return normalizeTimePeriods(periods);
}

// ─── Local-to-Instant Conversion ─────────────────────────────────────────────

/**
 * Converts local wall-clock time periods on a specific date to exact instant ranges.
 *
 * Uses the tenant's IANA timezone for conversion, properly handling DST.
 * Periods that result in zero-length or negative ranges (due to DST spring-forward)
 * are excluded.
 */
function localPeriodsToInstantRanges(
  periods: TimePeriod[],
  localDate: string,
  timeZone: string
): InstantRange[] {
  const dateParts = localDate.split("-").map(Number);
  const year = dateParts[0]!;
  const month = dateParts[1]! - 1; // 0-indexed
  const day = dateParts[2]!;

  const ranges: InstantRange[] = [];

  for (const period of periods) {
    const [startH, startM] = period.startTime.split(":").map(Number);
    const [endH, endM] = period.endTime.split(":").map(Number);

    const startTz = fromZonedTime(new Date(year, month, day, startH!, startM!, 0, 0), timeZone);
    const endTz = fromZonedTime(new Date(year, month, day, endH!, endM!, 0, 0), timeZone);

    const startMs = startTz.getTime();
    const endMs = endTz.getTime();

    // Skip invalid ranges (can happen during DST spring-forward)
    if (endMs <= startMs) continue;

    ranges.push({
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
    });
  }

  return ranges;
}

// ─── Time-Off Block Resolution ───────────────────────────────────────────────

/**
 * Extracts time-off blocks applicable to a resource at a location.
 *
 * Rules:
 * - Global time off (location_id = NULL) blocks all locations.
 * - Location-specific time off blocks only that location.
 * - Time off for other locations is ignored.
 */
function getResourceTimeOffBlocks(
  resourceId: string,
  locationId: string,
  allTimeOff: ResourceTimeOffRow[]
): InstantRange[] {
  return allTimeOff
    .filter((to) => {
      if (to.resourceId !== resourceId) return false;
      // Global (null location) or matching location
      return to.locationId === null || to.locationId === locationId;
    })
    .map((to) => ({
      start: to.startsAt,
      end: to.endsAt,
    }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyResult(
  request: AvailabilityRequest,
  timeZone: string,
  reasonCode: AvailabilityReasonCode
): AvailabilityResult {
  return {
    tenantId: request.tenantId,
    serviceId: request.serviceId,
    locationId: request.locationId,
    localDate: request.localDate,
    timeZone,
    resources: [],
    totalSlots: 0,
    reasonCode,
  };
}
