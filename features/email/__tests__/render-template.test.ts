import { describe, it, expect } from "vitest";
import {
  renderConfirmationEmail,
  renderRescheduleEmail,
  renderCancellationEmail,
  renderReminderEmail,
} from "../lib/render-template";
import type { BookingEmailData, RescheduleEmailData, CancellationEmailData } from "../types";

/**
 * Email Template Rendering Tests — Milestone 18.2.
 */

const makeData = (): BookingEmailData => ({
  tenant: { name: "Acme Salon", logoUrl: null, primaryColor: "#2563eb" },
  booking: {
    reference: "APT-2026-000042",
    startsAt: "2026-09-15T10:00:00Z",
    endsAt: "2026-09-15T10:30:00Z",
    localDate: "2026-09-15",
    localStartTime: "10:00",
    localEndTime: "10:30",
    serviceName: "Classic Haircut",
    staffName: "Jane Doe",
    locationName: "Downtown Studio",
    durationMinutes: 30,
    price: "25.00",
    currency: "USD",
    timeZone: "Europe/Belgrade",
  },
  customer: { name: "John Smith", email: "john@example.com" },
  manageUrl: "https://example.com/manage",
});

describe("renderConfirmationEmail", () => {
  it("returns subject, html, and text", () => {
    const result = renderConfirmationEmail(makeData());
    expect(result.subject).toContain("APT-2026-000042");
    expect(result.subject).toContain("Confirmed");
    expect(result.html).toContain("Booking Confirmed");
    expect(result.html).toContain("John Smith");
    expect(result.html).toContain("Classic Haircut");
    expect(result.html).toContain("Downtown Studio");
    expect(result.html).toContain("Acme Salon");
    expect(result.html).toContain("#2563eb");
    expect(result.text).toContain("APT-2026-000042");
  });

  it("includes manage URL", () => {
    const result = renderConfirmationEmail(makeData());
    expect(result.html).toContain("https://example.com/manage");
    expect(result.text).toContain("https://example.com/manage");
  });

  it("omits price when zero", () => {
    const data = makeData();
    data.booking.price = "0";
    const result = renderConfirmationEmail(data);
    expect(result.html).not.toContain("USD 0");
  });
});

describe("renderRescheduleEmail", () => {
  it("shows old and new times", () => {
    const data: RescheduleEmailData = {
      ...makeData(),
      previousStartsAt: "2026-09-14T09:00:00Z",
      previousLocalDate: "2026-09-14",
      previousLocalStartTime: "09:00",
    };
    const result = renderRescheduleEmail(data);
    expect(result.subject).toContain("Rescheduled");
    expect(result.html).toContain("2026-09-14");
    expect(result.html).toContain("09:00");
    expect(result.html).toContain("2026-09-15");
    expect(result.html).toContain("10:00");
    expect(result.text).toContain("Previous");
    expect(result.text).toContain("New");
  });
});

describe("renderCancellationEmail", () => {
  it("shows cancelled status", () => {
    const data: CancellationEmailData = {
      ...makeData(),
      cancellationReason: "Schedule conflict",
    };
    const result = renderCancellationEmail(data);
    expect(result.subject).toContain("Cancelled");
    expect(result.html).toContain("Booking Cancelled");
    expect(result.html).toContain("Schedule conflict");
    expect(result.text).toContain("Reason: Schedule conflict");
  });

  it("omits reason when null", () => {
    const data: CancellationEmailData = { ...makeData(), cancellationReason: null };
    const result = renderCancellationEmail(data);
    expect(result.html).not.toContain("Reason:");
  });
});

describe("renderReminderEmail", () => {
  it("returns reminder content", () => {
    const result = renderReminderEmail(makeData());
    expect(result.subject).toContain("Reminder");
    expect(result.subject).toContain("Classic Haircut");
    expect(result.html).toContain("Appointment Reminder");
    expect(result.html).toContain("Manage Booking");
  });
});
