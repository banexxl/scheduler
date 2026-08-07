import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import type { TodaySummary } from "../services/get-today-summary";

/**
 * Dashboard Today Card — Milestone 8.3.
 *
 * Compact widget showing today's appointment summary on the business dashboard.
 * Displays total, upcoming, checked in, in progress counts and a link to
 * the full today schedule.
 *
 * Server component — receives pre-loaded data as props.
 */

type Props = {
  tenantSlug: string;
  summary: TodaySummary;
};

export default function DashboardTodayCard({ tenantSlug, summary }: Props) {
  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Today</Typography>
        <Button
          component="a"
          href={`/${tenantSlug}/appointments/today`}
          size="small"
          variant="text"
        >
          View schedule &rarr;
        </Button>
      </Box>

      {summary.total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No appointments scheduled for today.
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${summary.total} total`} size="small" color="primary" variant="outlined" />
          {summary.upcoming > 0 && (
            <Chip label={`${summary.upcoming} upcoming`} size="small" color="info" variant="outlined" />
          )}
          {summary.checkedIn > 0 && (
            <Chip label={`${summary.checkedIn} checked in`} size="small" color="success" variant="outlined" />
          )}
          {summary.inProgress > 0 && (
            <Chip label={`${summary.inProgress} in progress`} size="small" color="warning" variant="outlined" />
          )}
          {summary.completed > 0 && (
            <Chip label={`${summary.completed} completed`} size="small" variant="outlined" />
          )}
        </Stack>
      )}
    </Paper>
  );
}
