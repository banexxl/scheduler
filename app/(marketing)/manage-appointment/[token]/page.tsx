import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import ManagedAppointmentPage from "@/features/appointments/self-service/components/managed-appointment-page";
import { getManagedAppointmentByTokenAction } from "@/features/appointments/self-service/actions/manage-appointment-actions";
import type { PublicManagedAppointment } from "@/features/appointments/self-service/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
     title: "Manage appointment",
     robots: {
          index: false,
          follow: false,
     },
};

export default async function ManageAppointmentTokenPage({
     params,
}: {
     params: Promise<{ token: string }>;
}) {
     const { token } = await params;
     const result = await getManagedAppointmentByTokenAction(token);

     if (!result.success) {
          return (
               <Box sx={{ maxWidth: 760, mx: "auto", p: { xs: 2, sm: 3 } }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
                         Manage Appointment
                    </Typography>
                    <Alert severity="warning">This appointment link is invalid or no longer available.</Alert>
               </Box>
          );
     }

     return (
          <ManagedAppointmentPage
               token={token}
               initialAppointment={result.data.appointment as PublicManagedAppointment}
          />
     );
}
