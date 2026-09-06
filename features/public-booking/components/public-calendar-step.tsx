"use client";

/**
 * Public Calendar Step — Booking flow redesign.
 *
 * A polished month calendar for choosing an appointment date. Selecting a
 * date advances the flow to location selection (calendar-first ordering).
 *
 * - Full month grid with prev/next month navigation
 * - Past dates disabled, today highlighted, selected date emphasized
 * - Tenant-local "today" (avoids browser-timezone drift)
 * - Fade / scale animation on month change and mount
 * - Fully keyboard accessible
 */

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ButtonBase from "@mui/material/ButtonBase";
import Fade from "@mui/material/Fade";

type Props = {
     /** Tenant-local ISO date (YYYY-MM-DD) representing "today". */
     todayLocalDate: string;
     timeZone: string;
     selectedDate: string | null;
     onSelect: (localDate: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
     "January", "February", "March", "April", "May", "June",
     "July", "August", "September", "October", "November", "December",
];

function parseISO(dateStr: string): { y: number; m: number; d: number } {
     const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
     return { y, m, d };
}

function toISO(y: number, m: number, d: number): string {
     return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Days in a given month (m is 1-based). */
function daysInMonth(y: number, m: number): number {
     return new Date(y, m, 0).getDate();
}

/** Weekday index (0 = Monday .. 6 = Sunday) of the 1st of the month. */
function firstWeekdayMondayBased(y: number, m: number): number {
     const jsDay = new Date(y, m - 1, 1).getDay(); // 0 = Sun
     return (jsDay + 6) % 7;
}

export default function PublicCalendarStep({
     todayLocalDate,
     timeZone,
     selectedDate,
     onSelect,
}: Props) {
     const today = useMemo(() => parseISO(todayLocalDate), [todayLocalDate]);

     // The month currently displayed (defaults to selected date's month or today).
     const initial = selectedDate ? parseISO(selectedDate) : today;
     const [viewYear, setViewYear] = useState(initial.y);
     const [viewMonth, setViewMonth] = useState(initial.m); // 1-based
     const [fadeIn, setFadeIn] = useState(true);

     const canGoPrev = useMemo(() => {
          // Disable prev if the displayed month is at/before today's month.
          return viewYear > today.y || (viewYear === today.y && viewMonth > today.m);
     }, [viewYear, viewMonth, today]);

     function changeMonth(delta: number) {
          setFadeIn(false);
          // Small delay so the fade-out is perceptible before the grid swaps.
          window.setTimeout(() => {
               let m = viewMonth + delta;
               let y = viewYear;
               if (m < 1) {
                    m = 12;
                    y -= 1;
               } else if (m > 12) {
                    m = 1;
                    y += 1;
               }
               setViewMonth(m);
               setViewYear(y);
               setFadeIn(true);
          }, 120);
     }

     const cells = useMemo(() => {
          const lead = firstWeekdayMondayBased(viewYear, viewMonth);
          const total = daysInMonth(viewYear, viewMonth);
          const result: Array<number | null> = [];
          for (let i = 0; i < lead; i++) result.push(null);
          for (let d = 1; d <= total; d++) result.push(d);
          while (result.length % 7 !== 0) result.push(null);
          return result;
     }, [viewYear, viewMonth]);

     const todayISO = toISO(today.y, today.m, today.d);

     return (
          <Box>
               <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Choose a date
               </Typography>
               <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                    Times shown in {timeZone}
               </Typography>

               {/* Month navigation */}
               <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <IconButton
                         size="small"
                         onClick={() => changeMonth(-1)}
                         disabled={!canGoPrev}
                         aria-label="Previous month"
                         sx={{ fontSize: "1.25rem" }}
                    >
                         ‹
                    </IconButton>
                    <Typography sx={{ fontWeight: 600, fontSize: "1rem" }}>
                         {MONTHS[viewMonth - 1]} {viewYear}
                    </Typography>
                    <IconButton
                         size="small"
                         onClick={() => changeMonth(1)}
                         aria-label="Next month"
                         sx={{ fontSize: "1.25rem" }}
                    >
                         ›
                    </IconButton>
               </Box>

               {/* Weekday header */}
               <Box
                    sx={{
                         display: "grid",
                         gridTemplateColumns: "repeat(7, 1fr)",
                         gap: 0.5,
                         mb: 0.5,
                    }}
               >
                    {WEEKDAYS.map((w) => (
                         <Typography
                              key={w}
                              variant="caption"
                              sx={{ textAlign: "center", color: "text.secondary", fontWeight: 600, py: 0.5 }}
                         >
                              {w}
                         </Typography>
                    ))}
               </Box>

               {/* Day grid */}
               <Fade in={fadeIn} timeout={200}>
                    <Box
                         sx={{
                              display: "grid",
                              gridTemplateColumns: "repeat(7, 1fr)",
                              gap: 0.5,
                         }}
                    >
                         {cells.map((day, idx) => {
                              if (day === null) {
                                   return <Box key={`empty-${idx}`} sx={{ aspectRatio: "1" }} />;
                              }
                              const iso = toISO(viewYear, viewMonth, day);
                              const isPast = iso < todayISO;
                              const isToday = iso === todayISO;
                              const isSelected = iso === selectedDate;

                              return (
                                   <ButtonBase
                                        key={iso}
                                        disabled={isPast}
                                        onClick={() => onSelect(iso)}
                                        aria-label={`${MONTHS[viewMonth - 1]} ${day}, ${viewYear}`}
                                        aria-pressed={isSelected}
                                        sx={{
                                             aspectRatio: "1",
                                             borderRadius: 2,
                                             fontSize: "0.9rem",
                                             fontWeight: isSelected ? 700 : 500,
                                             color: isPast
                                                  ? "rgba(240,240,245,0.28)"
                                                  : isSelected
                                                       ? "#ffffff"
                                                       : "#e9e6f5",
                                             bgcolor: isSelected ? "primary.main" : "transparent",
                                             border: isToday && !isSelected ? "1.5px solid" : "1.5px solid transparent",
                                             borderColor: isToday && !isSelected ? "#a78bfa" : "transparent",
                                             transition: "background-color 0.2s, transform 0.15s, box-shadow 0.2s",
                                             boxShadow: isSelected ? "0 6px 18px rgba(124,58,237,0.5)" : 0,
                                             "&:hover": isPast
                                                  ? {}
                                                  : {
                                                       bgcolor: isSelected ? "primary.dark" : "rgba(167,139,250,0.15)",
                                                       transform: "scale(1.06)",
                                                  },
                                             "&.Mui-disabled": { color: "rgba(240,240,245,0.28)", opacity: 0.5 },
                                        }}
                                   >
                                        {day}
                                   </ButtonBase>
                              );
                         })}
                    </Box>
               </Fade>
          </Box>
     );
}
