"use client";

/**
 * Public Time Step — Booking flow redesign.
 *
 * Shows available time slots for an already-selected date (the calendar step
 * picks the date, the location step picks the location, then this step loads
 * slots). Slots are grouped morning / afternoon / evening.
 *
 * - Loading skeleton
 * - Stale-request guarding
 * - "Next available" fallback search
 * - Fade-in animation for loaded slots
 */

import { useEffect, useState, useCallback, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Fade from "@mui/material/Fade";
import type { PublicAvailabilityOption } from "../types/public-booking";
import { getPublicAvailabilityAction } from "../actions/get-public-availability-action";

type Props = {
     tenantSlug: string;
     serviceId: string;
     locationId: string;
     resourceId: string | null;
     selectedDate: string;
     timeZone: string;
     onSelect: (option: PublicAvailabilityOption, resourceId: string) => void;
     onBack: () => void;
     /** Called when the user picks a different date via "next available". */
     onDateChange: (localDate: string) => void;
};

function addDays(dateStr: string, days: number): string {
     const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
     const date = new Date(y, m - 1, d + days);
     return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateHeading(dateStr: string): string {
     const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
     const dt = new Date(y, m - 1, d);
     return dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function getTimeGroup(localTime: string): "morning" | "afternoon" | "evening" {
     const hour = parseInt(localTime.split(":")[0]!, 10);
     if (hour < 12) return "morning";
     if (hour < 17) return "afternoon";
     return "evening";
}

const GROUP_LABELS = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

export default function PublicTimeStep({
     tenantSlug,
     serviceId,
     locationId,
     resourceId,
     selectedDate,
     timeZone,
     onSelect,
     onBack,
     onDateChange,
}: Props) {
     const [options, setOptions] = useState<PublicAvailabilityOption[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState("");
     const [searchingNext, setSearchingNext] = useState(false);
     const requestRef = useRef(0);

     const loadAvailability = useCallback(async (date: string) => {
          const reqId = ++requestRef.current;
          setLoading(true);
          setError("");
          setOptions([]);

          const result = await getPublicAvailabilityAction(tenantSlug, {
               serviceId,
               locationId,
               resourceId: resourceId ?? undefined,
               localDate: date,
          });

          if (reqId !== requestRef.current) return; // stale
          setLoading(false);

          if (!result.success) {
               setError(result.error);
               return;
          }
          setOptions(result.data.options);
     }, [tenantSlug, serviceId, locationId, resourceId]);

     // Load whenever the selected date changes. The load is dispatched
     // asynchronously so state updates don't run synchronously in the effect
     // body (avoids cascading renders).
     useEffect(() => {
          let cancelled = false;
          void Promise.resolve().then(() => {
               if (!cancelled) loadAvailability(selectedDate);
          });
          return () => { cancelled = true; };
     }, [selectedDate, loadAvailability]);

     async function handleNextAvailable() {
          setSearchingNext(true);
          setError("");
          const maxDays = 30;
          for (let i = 1; i <= maxDays; i++) {
               const date = addDays(selectedDate, i);
               const result = await getPublicAvailabilityAction(tenantSlug, {
                    serviceId,
                    locationId,
                    resourceId: resourceId ?? undefined,
                    localDate: date,
               });
               if (result.success && result.data.options.length > 0) {
                    setSearchingNext(false);
                    onDateChange(date);
                    return;
               }
          }
          setSearchingNext(false);
          setError("No availability found in the next 30 days.");
     }

     function handleSlotSelect(option: PublicAvailabilityOption) {
          const resId = option.resourceOptions[0]?.resourceId;
          if (resId) onSelect(option, resId);
     }

     const grouped = options.reduce<Record<string, PublicAvailabilityOption[]>>((acc, opt) => {
          const group = getTimeGroup(opt.localStartTime);
          if (!acc[group]) acc[group] = [];
          acc[group]!.push(opt);
          return acc;
     }, {});

     return (
          <Box>
               <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Choose a time
               </Typography>
               <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                    {formatDateHeading(selectedDate)} · {timeZone}
               </Typography>

               {loading && (
                    <Stack spacing={1}>
                         <Skeleton variant="rounded" height={36} width="60%" />
                         <Skeleton variant="rounded" height={36} width="80%" />
                         <Skeleton variant="rounded" height={36} width="40%" />
                    </Stack>
               )}

               {error && <Alert severity="info" sx={{ mb: 2 }}>{error}</Alert>}

               {!loading && options.length > 0 && (
                    <Fade in timeout={300}>
                         <Box>
                              {(["morning", "afternoon", "evening"] as const).map((group) => {
                                   const slots = grouped[group];
                                   if (!slots || slots.length === 0) return null;
                                   return (
                                        <Box key={group} sx={{ mb: 2 }}>
                                             <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.75, display: "block" }}>
                                                  {GROUP_LABELS[group]}
                                             </Typography>
                                             <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                                  {slots.map((opt) => (
                                                       <Chip
                                                            key={opt.startsAt}
                                                            label={opt.localStartTime}
                                                            onClick={() => handleSlotSelect(opt)}
                                                            clickable
                                                            variant="outlined"
                                                            color="primary"
                                                            sx={{
                                                                 fontWeight: 600,
                                                                 minWidth: 64,
                                                                 transition: "transform 0.15s, background-color 0.15s",
                                                                 "&:hover": { transform: "translateY(-1px)" },
                                                            }}
                                                            aria-label={`${opt.localStartTime} to ${opt.localEndTime}`}
                                                       />
                                                  ))}
                                             </Box>
                                        </Box>
                                   );
                              })}

                              <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                                   Times are not reserved until your booking is confirmed.
                              </Alert>
                         </Box>
                    </Fade>
               )}

               {!loading && options.length === 0 && !error && (
                    <Box sx={{ textAlign: "center", py: 2 }}>
                         <Typography variant="body2" color="text.secondary">
                              No times available on this date.
                         </Typography>
                         <Button
                              size="small"
                              variant="text"
                              onClick={handleNextAvailable}
                              disabled={searchingNext}
                              sx={{ mt: 1 }}
                         >
                              {searchingNext ? "Searching..." : "Find next available →"}
                         </Button>
                    </Box>
               )}

               <Button onClick={onBack} sx={{ mt: 2 }} variant="text">Back</Button>
          </Box>
     );
}
