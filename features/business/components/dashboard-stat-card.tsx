import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

type DashboardStatCardProps = {
  label: string;
  value: number | string;
  helperText?: string;
};

/**
 * A simple stat card for the business dashboard.
 * Displays a label, a large value, and optional helper text.
 */
export default function DashboardStatCard({
  label,
  value,
  helperText,
}: DashboardStatCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h4" component="p" sx={{ fontWeight: 600, mb: 0.5 }}>
        {value}
      </Typography>
      {helperText && (
        <Box sx={{ mt: "auto" }}>
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
