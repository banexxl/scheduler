"use client";

/**
 * Public Booking Shell — Milestone 8.5.
 *
 * Provides branded wrapper for the entire public booking flow:
 * - Tenant branding (logo, name, description)
 * - Progress stepper (desktop: labels, mobile: step X of Y)
 * - Consistent spacing and max-width
 * - Error boundary surface
 * - Responsive layout (mobile-first)
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import type { PublicBookingTenant, PublicBookingSettings } from "../types/public-booking";

const STEP_LABELS = ["Service", "Location", "Time", "Details", "Review"];

type Props = {
  tenant: PublicBookingTenant;
  settings: PublicBookingSettings;
  currentStep: number;
  totalSteps: number;
  isConfirmed: boolean;
  children: React.ReactNode;
};

export default function PublicBookingShell({
  tenant,
  settings,
  currentStep,
  totalSteps,
  isConfirmed,
  children,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", pb: 4 }}>
      {/* Business Hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
          color: "white",
          pt: { xs: 3, sm: 4 },
          pb: { xs: 4, sm: 5 },
          px: 2,
          textAlign: "center",
        }}
      >
        {tenant.logoUrl && (
          <Box
            component="img"
            src={tenant.logoUrl}
            alt={`${tenant.name} logo`}
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              objectFit: "cover",
              mb: 1.5,
              border: "3px solid rgba(255,255,255,0.3)",
            }}
          />
        )}
        <Typography variant="h5" component="h1" fontWeight={700}>
          {settings.bookingPageTitle ?? `Book with ${tenant.name}`}
        </Typography>
        {settings.bookingPageDescription && (
          <Typography
            variant="body2"
            sx={{ mt: 0.5, opacity: 0.9, maxWidth: 480, mx: "auto" }}
          >
            {settings.bookingPageDescription}
          </Typography>
        )}
      </Box>

      {/* Content Card */}
      <Box sx={{ maxWidth: 560, mx: "auto", mt: { xs: -2, sm: -3 }, px: { xs: 1.5, sm: 2 } }}>
        <Paper
          elevation={3}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          {/* Stepper */}
          {!isConfirmed && (
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 }, pb: 1 }}>
              {isMobile ? (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Step {currentStep + 1} of {totalSteps} — {STEP_LABELS[currentStep] ?? ""}
                </Typography>
              ) : (
                <Stepper activeStep={currentStep} alternativeLabel>
                  {STEP_LABELS.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              )}
            </Box>
          )}

          {/* Step Content */}
          <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
            {children}
          </Box>
        </Paper>

        {/* Footer */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textAlign: "center", mt: 2 }}
        >
          Powered by {tenant.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: "block", textAlign: "center", mt: 0.5 }}
        >
          <Box
            component="a"
            href={`/book/${tenant.slug}/portal`}
            sx={{ color: "text.secondary", textDecoration: "underline", "&:hover": { color: "primary.main" } }}
          >
            Already booked? View your appointments
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
