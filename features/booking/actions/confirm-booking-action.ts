"use server";

/**
 * Confirm Booking Server Action — Milestone 17.2.
 *
 * Atomic booking creation:
 * 1. Validate all inputs
 * 2. Revalidate slot availability
 * 3. Create appointment via trusted service
 * 4. Return confirmation data
 */

import { createAppointment } from "@/features/appointments/services/create-appointment";
import type { BookingConfirmation, CustomerInfo, SelectedService, BookingTimeSlot } from "../types";

export type ConfirmBookingInput = {
  tenantId: string;
  tenantSlug: string;
  services: SelectedService[];
  locationId: string;
  staffResourceId: string | null;
  date: string;
  slot: BookingTimeSlot;
  customer: CustomerInfo;
};

export type ConfirmBookingResult =
  | { success: true; confirmation: BookingConfirmation }
  | { success: false; error: string; code?: string };

export async function confirmBookingAction(
  input: ConfirmBookingInput
): Promise<ConfirmBookingResult> {
  const { tenantId, services, locationId, slot, date, customer } = input;

  // Validate prerequisites
  if (services.length === 0) return { success: false, error: "No services selected.", code: "NO_SERVICES" };
  if (!locationId) return { success: false, error: "No location selected.", code: "NO_LOCATION" };
  if (!date) return { success: false, error: "No date selected.", code: "NO_DATE" };
  if (!slot) return { success: false, error: "No time slot selected.", code: "NO_SLOT" };
  if (!customer.firstName.trim() || !customer.lastName.trim()) return { success: false, error: "Name is required.", code: "VALIDATION" };
  if (!customer.email.trim()) return { success: false, error: "Email is required.", code: "VALIDATION" };
  if (!customer.phone.trim()) return { success: false, error: "Phone is required.", code: "VALIDATION" };

  // Use the first service for the appointment (multi-service is a future enhancement)
  const primaryService = services[0]!;
  const customerName = `${customer.firstName.trim()} ${customer.lastName.trim()}`;

  // Create appointment via the trusted service (handles slot revalidation + atomic insert)
  const result = await createAppointment({
    tenantId,
    serviceId: primaryService.id,
    locationId,
    resourceId: slot.resourceId,
    customerName,
    customerEmail: customer.email.trim(),
    customerPhone: customer.phone.trim(),
    localDate: date,
    localStartTime: slot.localStartTime,
    status: "confirmed",
    source: "online",
    customerNotes: customer.notes.trim() || null,
    internalNotes: null,
    createdBy: null,
  });

  if (!result.success) {
    const isConflict = result.code === "APPOINTMENT_CONFLICT" || result.code === "SLOT_NO_LONGER_AVAILABLE";
    if (isConflict) {
      return { success: false, error: "That time was just booked. Please choose another.", code: "SLOT_TAKEN" };
    }
    return { success: false, error: result.error, code: result.code };
  }

  const appt = result.appointment;

  return {
    success: true,
    confirmation: {
      appointmentNumber: appt.appointmentNumber,
      tenantName: appt.locationNameSnapshot,
      serviceName: appt.serviceNameSnapshot,
      locationName: appt.locationNameSnapshot,
      resourceName: appt.resourceNameSnapshot,
      localDate: date,
      localStartTime: slot.localStartTime,
      localEndTime: slot.localEndTime,
      durationMinutes: appt.durationMinutes,
      price: String(appt.price),
      currency: appt.currency,
      customerName,
    },
  };
}
