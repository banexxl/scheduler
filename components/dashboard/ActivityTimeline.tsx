"use client";

/**
 * Activity Timeline — animated vertical timeline for recent events.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { dashboardColors, dashboardMotion } from "@/styles/theme/dashboard-tokens";

export type TimelineItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  color?: string;
};

type Props = {
  items: TimelineItem[];
};

export default function ActivityTimeline({ items }: Props) {
  return (
    <Stack spacing={0} component={motion.div} initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.1 } } }}>
      {items.map((item, idx) => (
        <Box
          key={item.id}
          component={motion.div}
          variants={dashboardMotion.fadeUp}
          sx={{ display: "flex", gap: 1.5, pb: idx < items.length - 1 ? 2.5 : 0 }}
        >
          {/* Dot + line */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5, flexShrink: 0 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: item.color || dashboardColors.accent.primary,
                boxShadow: `0 0 8px ${item.color || dashboardColors.accent.primary}40`,
              }}
            />
            {idx < items.length - 1 && (
              <Box sx={{ width: 1, flexGrow: 1, bgcolor: dashboardColors.border.subtle, mt: 0.5 }} />
            )}
          </Box>

          {/* Content */}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: dashboardColors.text.primary }}>
              {item.title}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted, mt: 0.25 }}>
              {item.description}
            </Typography>
            <Typography sx={{ fontSize: "0.6875rem", color: dashboardColors.text.muted, mt: 0.5 }}>
              {item.time}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
