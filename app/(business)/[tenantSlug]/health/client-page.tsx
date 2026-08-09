"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import type { BusinessHealthSummary } from "@/features/business-health/types/business-health";

type Props = { tenantSlug: string; health: BusinessHealthSummary };

const STATUS_COLORS: Record<string, "success" | "warning" | "error" | "default"> = {
  ready: "success", needs_attention: "warning", blocked: "error", optional: "default",
};

export default function HealthClientPage({ tenantSlug, health }: Props) {
  return (
    <Box>
      {/* Overall */}
      <Alert severity={health.overallStatus === "ready" ? "success" : health.overallStatus === "blocked" ? "error" : "warning"} sx={{ mb: 3 }}>
        {health.overallStatus === "ready" && "Everything looks ready. Your business is configured for normal operation."}
        {health.overallStatus === "needs_attention" && `${health.attentionCount} item(s) need attention.`}
        {health.overallStatus === "blocked" && `${health.blockedCount} critical issue(s) block normal operation.`}
      </Alert>

      {/* Summary */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap">
        <Chip label={`${health.readyCount} ready`} color="success" size="small" />
        {health.attentionCount > 0 && <Chip label={`${health.attentionCount} attention`} color="warning" size="small" />}
        {health.blockedCount > 0 && <Chip label={`${health.blockedCount} blocked`} color="error" size="small" />}
        {health.optionalCount > 0 && <Chip label={`${health.optionalCount} optional`} size="small" />}
      </Stack>

      {/* Checks */}
      <Stack spacing={1.5}>
        {health.checks.map((check) => (
          <Paper key={check.key} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="body2" fontWeight={600}>{check.title}</Typography>
                <Typography variant="caption" color="text.secondary">{check.description}</Typography>
                {check.impact && <Typography variant="caption" color="error.main" display="block">{check.impact}</Typography>}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={check.status.replace("_", " ")} size="small" color={STATUS_COLORS[check.status] ?? "default"} />
                {check.actionUrl && check.actionLabel && (
                  <Button size="small" component="a" href={`/${tenantSlug}/${check.actionUrl}`}>{check.actionLabel}</Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
