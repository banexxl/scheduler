"use client";

/**
 * Device Frame — Milestone 16.2.
 *
 * Wraps content in a device-shaped container for template preview.
 * Supports desktop and mobile modes.
 */

import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export type DeviceMode = "desktop" | "mobile";

type Props = {
  mode: DeviceMode;
  children: ReactNode;
};

const FRAME_STYLES: Record<DeviceMode, object> = {
  desktop: {
    width: "100%",
    maxWidth: 960,
    height: 580,
    borderRadius: 2,
    border: 1,
    borderColor: "divider",
  },
  mobile: {
    width: 375,
    height: 667,
    borderRadius: 4,
    border: 2,
    borderColor: "divider",
    mx: "auto",
  },
};

export default function DeviceFrame({ mode, children }: Props) {
  return (
    <Box
      sx={{
        ...FRAME_STYLES[mode],
        overflow: "auto",
        bgcolor: "background.default",
        position: "relative",
      }}
    >
      {children}
    </Box>
  );
}
