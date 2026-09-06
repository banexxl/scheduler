import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { OnboardingProgress, OnboardingStepKey } from "../types/onboarding";

const STEP_LABELS: Record<OnboardingStepKey, string> = {
     business_details: "Business details",
     location: "Location",
     resource: "Resource",
     service: "Service",
     working_hours: "Working hours",
     booking_rules: "Booking preferences",
     public_booking: "Public booking",
     complete: "Ready",
};

type Props = {
     tenantSlug: string;
     progress: OnboardingProgress;
};

/**
 * Dashboard banner shown when onboarding is not finished.
 *
 * Surfaces the remaining steps and links the user to the onboarding flow.
 * Renders nothing when onboarding is complete.
 */
export function OnboardingWarning({ tenantSlug, progress }: Props) {
     if (progress.status === "completed" || progress.remainingSteps.length === 0) {
          return null;
     }

     const remaining = progress.remainingSteps.filter((step) => step !== "complete");

     return (
          <Alert
               severity="warning"
               sx={{ mb: 3 }}
               action={
                    <Button
                         href={`/${tenantSlug}/onboarding`}
                         color="inherit"
                         size="small"
                         variant="outlined"
                    >
                         Finish setup
                    </Button>
               }
          >
               <AlertTitle>Finish setting up your business</AlertTitle>
               <Typography variant="body2" sx={{ mb: remaining.length > 0 ? 1 : 0 }}>
                    Your onboarding is {progress.percentComplete}% complete. Complete the remaining steps to start
                    accepting bookings.
               </Typography>
               {remaining.length > 0 && (
                    <Box>
                         <Typography variant="caption" color="text.secondary">
                              Remaining steps:
                         </Typography>
                         <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", gap: 1 }}>
                              {remaining.map((step) => (
                                   <Chip key={step} label={STEP_LABELS[step]} size="small" variant="outlined" />
                              ))}
                         </Stack>
                    </Box>
               )}
          </Alert>
     );
}
