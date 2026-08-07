import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { OnboardingProgress } from "../types/onboarding";

type Props = {
     tenantSlug: string;
     progress: OnboardingProgress;
};

export default function DashboardSetupChecklist({ tenantSlug, progress }: Props) {
     const steps = [
          { key: "business_details", label: "Business details" },
          { key: "location", label: "Add a location" },
          { key: "resource", label: "Add a resource" },
          { key: "service", label: "Create a service" },
          { key: "working_hours", label: "Set working hours" },
          { key: "booking_rules", label: "Configure booking" },
     ] as const;

     return (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
               <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
                    {progress.status === "completed" ? "Setup complete" : "Finish setting up your business"}
               </Typography>
               <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {progress.percentComplete}% complete
               </Typography>
               <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {steps.map((step) => {
                         const completed = progress.completedSteps.includes(step.key);
                         return (
                              <Box component="li" key={step.key} sx={{ mb: 0.75 }}>
                                   {completed ? <Typography variant="body2">✓ {step.label}</Typography> : (
                                        <Link component="a" href={`/${tenantSlug}/onboarding`} variant="body2">
                                             ○ {step.label}
                                        </Link>
                                   )}
                              </Box>
                         );
                    })}
               </Box>
          </Paper>
     );
}
