"use client";

/**
 * Portal Page Shell — shared dark surface for portal sub-pages.
 *
 * Provides the dark (#0a0a0f) background and scopes dark-glass styling to all
 * nested MUI surfaces (Paper cards, tabs, dividers, typography), so individual
 * portal pages don't each have to re-declare light-on-dark overrides.
 *
 * Wrap the page content in this instead of a plain `<Box bgcolor="grey.50">`.
 */

import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

type Props = {
     children: ReactNode;
     /** Max width of the centered inner container. Defaults to 600. */
     maxWidth?: number;
     sx?: SxProps<Theme>;
};

export default function PortalPageShell({ children, maxWidth = 600, sx }: Props) {
     return (
          <Box
               sx={{
                    minHeight: "100vh",
                    bgcolor: "#0a0a0f",
                    color: "#f0f0f5",
                    py: 3,
                    px: { xs: 1.5, sm: 2 },
                    // Dark glass styling for all nested MUI surfaces.
                    "& .MuiPaper-root": {
                         bgcolor: "rgba(22,22,30,0.6)",
                         border: "1px solid rgba(255,255,255,0.06)",
                         backdropFilter: "blur(8px)",
                         color: "#e9e6f5",
                         backgroundImage: "none",
                    },
                    "& .MuiPaper-root.MuiPaper-outlined": {
                         bgcolor: "rgba(255,255,255,0.03)",
                    },
                    "& .MuiTypography-root": { color: "inherit" },
                    "& .MuiTypography-colorTextSecondary, & .MuiTypography-body2, & .MuiTypography-caption": {
                         color: "#8b8b9e",
                    },
                    "& .MuiTab-root": { color: "#8b8b9e" },
                    "& .MuiTab-root.Mui-selected": { color: "#f0f0f5" },
                    "& .MuiTabs-indicator": { backgroundColor: "#a78bfa" },
                    "& .MuiDivider-root": { borderColor: "rgba(255,255,255,0.08)" },
                    "& .MuiInputBase-input": { color: "#f0f0f5" },
                    "& .MuiInputLabel-root": { color: "rgba(233,230,245,0.7)" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.18)" },
                    ...sx,
               }}
          >
               <Box sx={{ maxWidth, mx: "auto" }}>{children}</Box>
          </Box>
     );
}
