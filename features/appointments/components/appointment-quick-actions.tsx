"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppointmentStatusAction } from "../actions/update-status-action";
import type { AppointmentStatus } from "../types/appointment";

type Props = {
     tenantSlug: string;
     appointmentId: string;
     currentStatus: AppointmentStatus;
};

const QUICK_ACTIONS: Record<AppointmentStatus, Array<{ label: string; status: AppointmentStatus }>> = {
     pending: [{ label: "Confirm", status: "confirmed" }],
     confirmed: [{ label: "Check in", status: "checked_in" }, { label: "Start service", status: "in_progress" }],
     checked_in: [{ label: "Start service", status: "in_progress" }],
     in_progress: [],
     completed: [],
     cancelled: [],
     no_show: [],
};

export default function AppointmentQuickActions({ tenantSlug, appointmentId, currentStatus }: Props) {
     const router = useRouter();
     const [isPending, startTransition] = useTransition();

     async function handleAction(status: AppointmentStatus) {
          const result = await updateAppointmentStatusAction(tenantSlug, appointmentId, { status });
          if (result.success) {
               startTransition(() => router.refresh());
          }
     }

     const actions = QUICK_ACTIONS[currentStatus];
     if (actions.length === 0) return null;

     return (
          <Box>
               <Typography variant="subtitle2" gutterBottom>Quick actions</Typography>
               <Stack direction="row" spacing={1} flexWrap="wrap">
                    {actions.map((action) => (
                         <Button key={action.status} size="small" variant="outlined" onClick={() => handleAction(action.status)} disabled={isPending}>
                              {action.label}
                         </Button>
                    ))}
               </Stack>
          </Box>
     );
}
