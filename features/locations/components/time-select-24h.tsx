"use client";

import { useMemo } from "react";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

type TimeSelect24hProps = {
     label: string;
     /** 24-hour "HH:MM" value, e.g. "17:00". */
     value: string;
     onChange: (value: string) => void;
     disabled?: boolean;
     /** Increment between options, in minutes. Defaults to 30. */
     stepMinutes?: number;
};

/**
 * A 24-hour time picker rendered as a native select.
 *
 * Unlike `<input type="time">`, the display format here does not depend on the
 * user's OS/browser locale — options are always shown as "HH:MM" (e.g. 17:00),
 * never "5:00 PM".
 */
function buildOptions(stepMinutes: number): string[] {
     const options: string[] = [];
     for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
          const h = Math.floor(minutes / 60);
          const m = minutes % 60;
          options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
     }
     return options;
}

export default function TimeSelect24h({
     label,
     value,
     onChange,
     disabled,
     stepMinutes = 30,
}: TimeSelect24hProps) {
     const options = useMemo(() => buildOptions(stepMinutes), [stepMinutes]);

     // Ensure the current value is always selectable even if it's off-grid
     // (e.g. an existing "09:15" record when the step is 30).
     const allOptions = useMemo(
          () => (value && !options.includes(value) ? [...options, value].sort() : options),
          [options, value]
     );

     return (
          <TextField
               label={label}
               select
               size="small"
               sx={{ width: 120 }}
               value={value}
               onChange={(e) => onChange(e.target.value)}
               disabled={disabled}
          >
               {allOptions.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                         {opt}
                    </MenuItem>
               ))}
          </TextField>
     );
}
