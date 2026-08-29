import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/features/email/actions/email-actions";

/**
 * Reminder Cron Endpoint — Milestone 18.2.
 *
 * Called hourly by an external scheduler (e.g., cron job, Vercel cron).
 * Finds appointments starting in 24h ±30min, sends reminder emails,
 * and marks them as reminded.
 *
 * Protected by CRON_SECRET header.
 */

export async function GET(request: Request) {
  // Verify cron secret
  const secret = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace("Bearer ", "");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();

  // Window: appointments starting between 23.5h and 24.5h from now
  const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

  // Find eligible appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, tenant_id, appointment_number, customer_name, customer_email, " +
      "service_name_snapshot, resource_name_snapshot, location_name_snapshot, " +
      "starts_at, ends_at, duration_minutes, price, currency, status, reminder_sent_at"
    )
    .in("status", ["pending", "confirmed"])
    .is("reminder_sent_at" as never, null)
    .gte("starts_at", windowStart.toISOString())
    .lte("starts_at", windowEnd.toISOString())
    .limit(100);

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ sent: 0, message: "No reminders due." });
  }

  let sent = 0;

  for (const row of appointments as unknown as Array<Record<string, unknown>>) {
    if (!row.customer_email) continue;

    // Get tenant slug
    const { data: tenant } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", row.tenant_id as string)
      .single();

    if (!tenant) continue;

    try {
      await sendReminderEmail(
        row.tenant_id as string,
        tenant.slug,
        {
          appointmentNumber: row.appointment_number as string,
          customerName: row.customer_name as string,
          customerEmail: row.customer_email as string,
          serviceNameSnapshot: row.service_name_snapshot as string,
          resourceNameSnapshot: row.resource_name_snapshot as string,
          locationNameSnapshot: row.location_name_snapshot as string,
          startsAt: row.starts_at as string,
          endsAt: row.ends_at as string,
          durationMinutes: row.duration_minutes as number,
          price: String(row.price),
          currency: row.currency as string,
        }
      );

      // Mark as reminded (best-effort — use column if it exists, otherwise skip)
      await supabase
        .from("appointments")
        .update({ reminder_sent_at: now.toISOString() } as never)
        .eq("id" as never, row.id as string);

      sent++;
    } catch (error) {
      console.error("[reminder-cron] Error sending reminder:", row.appointment_number, error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ sent, total: appointments.length });
}
