import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import { notFound } from "next/navigation";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getAppointmentById } from "@/features/appointments/services/appointment-queries";
import AppointmentEditForm from "@/features/appointments/components/appointment-edit-form";

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; appointmentId: string }>;
}) {
  const { tenantSlug, appointmentId } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const appointment = await getAppointmentById(tenant.id, appointmentId);
  if (!appointment) notFound();

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link
          component="a"
          href={`/${tenantSlug}/appointments/${appointmentId}`}
          variant="body2"
        >
          &larr; Back to Appointment
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Edit Appointment
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {appointment.appointmentNumber} — {appointment.serviceNameSnapshot}
      </Typography>

      <AppointmentEditForm
        tenantSlug={tenantSlug}
        appointmentId={appointmentId}
        initialValues={{
          customerName: appointment.customerName,
          customerEmail: appointment.customerEmail ?? "",
          customerPhone: appointment.customerPhone ?? "",
          internalNotes: appointment.internalNotes ?? "",
          customerNotes: appointment.customerNotes ?? "",
        }}
      />
    </Box>
  );
}
