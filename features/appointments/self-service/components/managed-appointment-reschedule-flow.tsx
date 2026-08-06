"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";

type Slot = {
     localStartTime: string;
     localEndTime: string;
     price: string;
     currency: string;
     durationMinutes: number;
};

type ResourceAvailability = {
     resourceId: string;
     resourceName: string;
     slots: Slot[];
};

export default function ManagedAppointmentRescheduleFlow({
     loading,
     resources,
     onLoadAvailability,
     onConfirm,
}: {
     loading: boolean;
     resources: ResourceAvailability[];
     onLoadAvailability: (localDate: string, resourceId: string | null) => Promise<void>;
     onConfirm: (input: {
          localDate: string;
          localStartTime: string;
          resourceId: string | null;
          reviewedPrice: string;
          reviewedCurrency: string;
          reviewedDurationMinutes: number;
     }) => Promise<void>;
}) {
     const [localDate, setLocalDate] = useState("");
     const [selected, setSelected] = useState<{ resourceId: string; slot: Slot } | null>(null);

     const flatSlots = useMemo(
          () => resources.flatMap((resource) => resource.slots.map((slot) => ({ resourceId: resource.resourceId, resourceName: resource.resourceName, slot }))),
          [resources]
     );

     return (
          <Box sx={{ mt: 3 }}>
               <Typography variant="h6" sx={{ mb: 1 }}>Reschedule</Typography>
               <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Availability will be checked again when you confirm.
               </Typography>
               <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Team member availability is included automatically.
               </Typography>

               <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
                    <TextField
                         type="date"
                         label="Date"
                         value={localDate}
                         onChange={(event) => setLocalDate(event.target.value)}
                         InputLabelProps={{ shrink: true }}
                         size="small"
                    />
                    <Button
                         variant="outlined"
                         disabled={!localDate || loading}
                         onClick={() => onLoadAvailability(localDate, null)}
                    >
                         Load times
                    </Button>
               </Box>

               <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                    {flatSlots.map(({ resourceId: itemResourceId, resourceName, slot }) => {
                         const key = `${itemResourceId}-${slot.localStartTime}`;
                         const active = selected?.resourceId === itemResourceId && selected.slot.localStartTime === slot.localStartTime;
                         return (
                              <Chip
                                   key={key}
                                   color={active ? "primary" : "default"}
                                   label={`${slot.localStartTime} (${resourceName || "Available team member"})`}
                                   onClick={() => setSelected({ resourceId: itemResourceId, slot })}
                                   sx={{ cursor: "pointer" }}
                              />
                         );
                    })}
               </Box>

               <Button
                    variant="contained"
                    disabled={!localDate || !selected || loading}
                    onClick={() => {
                         if (!selected) return;
                         return onConfirm({
                              localDate,
                              localStartTime: selected.slot.localStartTime,
                              resourceId: selected.resourceId,
                              reviewedPrice: String(selected.slot.price),
                              reviewedCurrency: selected.slot.currency,
                              reviewedDurationMinutes: selected.slot.durationMinutes,
                         });
                    }}
               >
                    Confirm rescheduling
               </Button>
          </Box>
     );
}
